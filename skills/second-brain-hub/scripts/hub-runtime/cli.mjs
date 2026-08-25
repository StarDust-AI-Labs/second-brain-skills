// Hub Runtime 命令编排。输出 JSON；退出码：0 成功，1 门禁拒绝/验证失败，2 用法错误或阻塞。
import fs from "node:fs";
import path from "node:path";
import {
  createLedger, newRunId, transition, recordEvent, saveLedger, loadLedger,
} from "./state.mjs";
import { loadContracts, getScene, requiredChain, isWriteMode } from "./contracts.mjs";
import { evaluatePreflight, checkWriteGate, validateCompletion } from "./gates.mjs";
import { renderMapCard, renderCompletionCard } from "./render.mjs";

const BOOL_FLAGS = new Set(["auth", "skip", "help"]);

export class UsageError extends Error {}

export function parseArgs(argv) {
  const flags = { _: [], output: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--output") {
      const kv = argv[i += 1] ?? "";
      const eq = kv.indexOf("=");
      if (eq <= 0) throw new UsageError(`--output needs key=value, got: ${kv}`);
      flags.output[kv.slice(0, eq)] = kv.slice(eq + 1);
    } else if (a.startsWith("--")) {
      const name = a.slice(2);
      if (BOOL_FLAGS.has(name)) flags[name] = true;
      else flags[name] = argv[i += 1];
    } else {
      flags._.push(a);
    }
  }
  return flags;
}

function emit(json) {
  console.log(JSON.stringify(json, null, 2));
}

function readConfig(stateDir) {
  const file = path.join(stateDir, "hub-state.json");
  if (!fs.existsSync(file)) {
    return { config_ok: false, reason: "hub-state.json not found", storage_mode: null, storage_path: null, storage_name: null };
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { config_ok: false, reason: "hub-state.json is not valid JSON", storage_mode: null, storage_path: null, storage_name: null };
  }
  const prefs = raw.preferences || {};
  const mode = prefs.storage_mode;
  const p = mode === "obsidian" ? prefs.vault_path : prefs.workspace_path;
  const name = mode === "obsidian" ? prefs.vault_name : prefs.workspace_name;
  if (!mode || !p || !path.isAbsolute(p)) {
    return { config_ok: false, reason: "storage_mode or absolute storage path missing", storage_mode: mode ?? null, storage_path: null, storage_name: null };
  }
  return { config_ok: true, reason: null, storage_mode: mode, storage_path: p, storage_name: name ?? null };
}

function requireDir(flags) {
  if (!flags["state-dir"]) throw new UsageError("--state-dir is required");
  return flags["state-dir"];
}

function loadRun(flags) {
  const stateDir = requireDir(flags);
  if (!flags["run-id"]) throw new UsageError("--run-id is required");
  return { stateDir, ledger: loadLedger(stateDir, flags["run-id"]) };
}

function reject(ledger, stateDir, now, reason, extra = {}) {
  recordEvent(ledger, "reject", reason, now);
  saveLedger(stateDir, ledger);
  return { exit: 1, json: { ok: false, run_id: ledger.run_id, state: ledger.state, reason, ...extra } };
}

// 所有现行写入契约中，写入能力都是最后一个必选步骤；它由 commit 结算。
function writeStepOf(scene) {
  if (!isWriteMode(scene)) return null;
  return scene.required_steps[scene.required_steps.length - 1];
}

export function cmdStart(flags, { now = new Date() } = {}) {
  const stateDir = requireDir(flags);
  const cfg = readConfig(stateDir);
  const ledger = createLedger({
    runId: newRunId(now),
    storageMode: cfg.storage_mode, storagePath: cfg.storage_path, storageName: cfg.storage_name, now,
  });
  transition(ledger, "CONFIG_CHECKED", { at: now, note: cfg.config_ok ? "ok" : `config missing: ${cfg.reason}` });
  recordEvent(ledger, "config-check", cfg.config_ok
    ? `storage=${cfg.storage_mode}:${cfg.storage_path}`
    : `config missing: ${cfg.reason}`, now);
  saveLedger(stateDir, ledger);
  return {
    exit: 0,
    json: {
      ok: true, command: "start", run_id: ledger.run_id, state: ledger.state,
      config_ok: cfg.config_ok, config_reason: cfg.reason,
      storage_mode: cfg.storage_mode, storage_path: cfg.storage_path,
    },
  };
}

export function cmdRoute(flags, { contracts = loadContracts(), now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  if (ledger.blocked_reason) return reject(ledger, stateDir, now, `blocked: ${ledger.blocked_reason}`);
  const scene = getScene(contracts.route, flags.scene);
  ledger.user_text = flags["user-text"] ?? null;
  transition(ledger, "INTENT_CLASSIFIED", { at: now, note: scene.intent });
  ledger.scene = scene.id;
  ledger.scene_label = scene.intent;
  transition(ledger, "CONTRACT_LOADED", { at: now, note: `contract=${scene.id} v${contracts.route.schema_version}` });
  ledger.steps.required_chain = requiredChain(scene);
  recordEvent(ledger, "contract", `required_steps=${scene.required_steps.join(",")}`, now);
  if (scene.requires_vault && !ledger.storage_path) {
    ledger.blocked_reason = "Vault 场景配置缺失：先完成 onboarding（SETUP），期间禁止第二大脑写入";
    transition(ledger, "MAP_CARD_EMITTED", { at: now, note: "blocked" });
    saveLedger(stateDir, ledger);
    return {
      exit: 2,
      json: {
        ok: false, command: "route", run_id: ledger.run_id, state: ledger.state,
        blocked: true, blocked_reason: ledger.blocked_reason, card: renderMapCard(ledger, scene),
      },
    };
  }
  transition(ledger, "MAP_CARD_EMITTED", { at: now });
  saveLedger(stateDir, ledger);
  return {
    exit: 0,
    json: {
      ok: true, command: "route", run_id: ledger.run_id, state: ledger.state,
      scene: scene.id, required_chain: ledger.steps.required_chain, card: renderMapCard(ledger, scene),
    },
  };
}

export function cmdStep(flags, { contracts = loadContracts(), now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  if (ledger.blocked_reason) return reject(ledger, stateDir, now, `blocked: ${ledger.blocked_reason}`);
  if (!["MAP_CARD_EMITTED", "EXECUTING"].includes(ledger.state)) {
    return reject(ledger, stateDir, now, `cannot run step in state ${ledger.state}`);
  }
  const scene = getScene(contracts.route, ledger.scene);
  const stepId = flags.step;
  if (!scene.step_order.includes(stepId)) return reject(ledger, stateDir, now, `step not in contract: ${stepId}`);
  if (ledger.steps.completed.includes(stepId) || ledger.steps.skipped[stepId] !== undefined) {
    return reject(ledger, stateDir, now, `step already settled: ${stepId}`);
  }
  const isConditional = scene.conditional_steps.some((c) => c.id === stepId);
  const isRequired = scene.required_steps.includes(stepId);
  if (flags.skip) {
    if (!isConditional) return reject(ledger, stateDir, now, `required step cannot be skipped: ${stepId}`);
    if (!flags.reason || !String(flags.reason).trim()) {
      return reject(ledger, stateDir, now, `skip needs --reason evidence: ${stepId}`);
    }
    ledger.steps.skipped[stepId] = String(flags.reason).trim();
    recordEvent(ledger, "step-skipped", `${stepId}: ${ledger.steps.skipped[stepId]}`, now);
  } else {
    if (!flags.evidence || !String(flags.evidence).trim()) {
      return reject(ledger, stateDir, now, `step needs --evidence: ${stepId}`);
    }
    if (writeStepOf(scene) === stepId) {
      return reject(ledger, stateDir, now, `write step is settled by commit, not step: ${stepId}`);
    }
    if (isRequired) {
      const writeStep = writeStepOf(scene);
      for (const s of scene.required_steps) {
        if (s === stepId || s === writeStep) break;
        if (!ledger.steps.completed.includes(s)) {
          return reject(ledger, stateDir, now, `out-of-order step: ${stepId} before ${s}`);
        }
      }
    }
    if (ledger.state === "MAP_CARD_EMITTED") transition(ledger, "EXECUTING", { at: now });
    ledger.steps.completed.push(stepId);
    ledger.steps.outputs[stepId] = String(flags.evidence).trim();
    recordEvent(ledger, "step-completed", `${stepId}: ${ledger.steps.outputs[stepId]}`, now);
  }
  for (const [k, v] of Object.entries(flags.output)) {
    ledger.steps.outputs[k] = v;
    recordEvent(ledger, "output", `${k}=${v}`, now);
  }
  saveLedger(stateDir, ledger);
  return {
    exit: 0,
    json: { ok: true, command: "step", run_id: ledger.run_id, state: ledger.state, step: stepId, card: renderMapCard(ledger, scene) },
  };
}

export function cmdPreflight(flags, { contracts = loadContracts(), now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  if (ledger.blocked_reason) return reject(ledger, stateDir, now, `blocked: ${ledger.blocked_reason}`);
  if (!["MAP_CARD_EMITTED", "EXECUTING"].includes(ledger.state)) {
    return reject(ledger, stateDir, now, `cannot preflight in state ${ledger.state}`);
  }
  const scene = getScene(contracts.route, ledger.scene);
  if (!isWriteMode(scene)) return reject(ledger, stateDir, now, `scene is not writable: ${scene.id}`);
  const writeStep = writeStepOf(scene);
  for (const s of scene.required_steps) {
    if (s === writeStep) continue;
    if (!ledger.steps.completed.includes(s)) {
      return reject(ledger, stateDir, now, `required step not completed before preflight: ${s}`);
    }
  }
  for (const c of scene.conditional_steps) {
    if (!ledger.steps.completed.includes(c.id) && ledger.steps.skipped[c.id] === undefined) {
      return reject(ledger, stateDir, now, `conditional step unsettled: ${c.id} (run it or --skip with --reason)`);
    }
  }
  let templateContent = null;
  if (flags["template-file"]) {
    if (!fs.existsSync(flags["template-file"])) {
      return reject(ledger, stateDir, now, `template file not found: ${flags["template-file"]}`);
    }
    templateContent = fs.readFileSync(flags["template-file"], "utf8");
  }
  const targetPath = flags["target-path"] ?? ledger.preflight.target_path;
  const res = evaluatePreflight(ledger, scene, {
    targetPath, templateContent, templatePath: flags["template-file"] ?? null, auth: Boolean(flags.auth),
  });
  ledger.preflight = {
    checked: true, gates: res.gates, write_allowed: res.write_allowed, write_token: res.write_token,
    target_path: targetPath, template_path: flags["template-file"] ?? ledger.preflight.template_path,
  };
  if (res.write_allowed) {
    transition(ledger, "PREFLIGHTED", { at: now });
    recordEvent(ledger, "preflight", `write_allowed=true token=${res.write_token}`, now);
  } else {
    recordEvent(ledger, "preflight", `write_allowed=false gates=${JSON.stringify(res.gates)}`, now);
  }
  saveLedger(stateDir, ledger);
  return {
    exit: res.write_allowed ? 0 : 1,
    json: {
      ok: res.write_allowed, command: "preflight", run_id: ledger.run_id, state: ledger.state,
      write_allowed: res.write_allowed, write_token: res.write_token, gates: res.gates,
      card: renderMapCard(ledger, scene),
    },
  };
}

export function cmdCommit(flags, { contracts = loadContracts(), now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  const gate = checkWriteGate(ledger, { token: flags.token ?? null, targetPath: flags["target-path"] ?? null });
  if (!gate.allowed) return reject(ledger, stateDir, now, gate.reason);
  if (ledger.state !== "PREFLIGHTED") return reject(ledger, stateDir, now, `cannot commit in state ${ledger.state}`);
  const scene = getScene(contracts.route, ledger.scene);
  let receipt = {};
  if (flags.receipt) {
    try {
      receipt = JSON.parse(flags.receipt);
    } catch {
      return reject(ledger, stateDir, now, "receipt is not valid JSON");
    }
  }
  if (receipt.ok === false) return reject(ledger, stateDir, now, "receipt reports failure; refusing to commit");
  // 失败关闭：创建/编辑类写入必须确认目标文件真实存在，禁止虚报成功。
  const op = receipt.operation;
  const target = flags["target-path"] ?? ledger.preflight.target_path;
  if ((op === "create" || op === "edit" || op === undefined) && target && !fs.existsSync(target)) {
    return reject(ledger, stateDir, now, `receipt target missing on disk: ${target}; refusing to commit`);
  }
  transition(ledger, "WRITE_COMMITTED", { at: now });
  const writeStep = writeStepOf(scene);
  if (writeStep && !ledger.steps.completed.includes(writeStep)) ledger.steps.completed.push(writeStep);
  for (const [key, value] of Object.entries(flags.output)) {
    ledger.steps.outputs[key] = value;
    recordEvent(ledger, "output", `${key}=${value}`, now);
  }
  ledger.commit = { committed: true, receipt: { ok: true, path: target, ...receipt, at: now.toISOString() } };
  recordEvent(ledger, "write-committed", `${writeStep}: ${target}`, now);
  saveLedger(stateDir, ledger);
  return {
    exit: 0,
    json: { ok: true, command: "commit", run_id: ledger.run_id, state: ledger.state, receipt: ledger.commit.receipt, card: renderMapCard(ledger, scene) },
  };
}

export function cmdGate(flags, { now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  const gate = checkWriteGate(ledger, { token: flags.token ?? null, targetPath: flags["target-path"] ?? null });
  recordEvent(ledger, "gate-check", gate.allowed ? "allowed" : `denied: ${gate.reason}`, now);
  saveLedger(stateDir, ledger);
  return {
    exit: gate.allowed ? 0 : 1,
    json: { ok: gate.allowed, command: "gate", run_id: ledger.run_id, state: ledger.state, allowed: gate.allowed, reason: gate.reason ?? null },
  };
}

export function cmdFinish(flags, { contracts = loadContracts(), now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  if (ledger.blocked_reason) return reject(ledger, stateDir, now, `blocked: ${ledger.blocked_reason}`);
  const scene = getScene(contracts.route, ledger.scene);
  const v = validateCompletion(ledger, scene);
  if (!v.ok) return reject(ledger, stateDir, now, "completion denied", { missing: v.missing });
  if (ledger.state === "MAP_CARD_EMITTED") transition(ledger, "EXECUTING", { at: now, note: "no step executed" });
  transition(ledger, "COMPLETION_CARD_EMITTED", { at: now });
  recordEvent(ledger, "completion", flags.result ?? "completed", now);
  saveLedger(stateDir, ledger);
  return {
    exit: 0,
    json: { ok: true, command: "finish", run_id: ledger.run_id, state: ledger.state, card: renderCompletionCard(ledger, scene, { result: flags.result ?? "" }) },
  };
}

export function cmdStatus(flags, { contracts = loadContracts() } = {}) {
  const { ledger } = loadRun(flags);
  let card = null;
  if (ledger.scene) card = renderMapCard(ledger, getScene(contracts.route, ledger.scene));
  return { exit: 0, json: { ok: true, command: "status", run_id: ledger.run_id, state: ledger.state, card, ledger } };
}

const COMMANDS = {
  start: cmdStart, route: cmdRoute, step: cmdStep, preflight: cmdPreflight,
  commit: cmdCommit, gate: cmdGate, finish: cmdFinish, status: cmdStatus,
};

export function main(argv) {
  const command = argv[0];
  const handler = COMMANDS[command];
  if (!handler) {
    emit({ ok: false, command: command ?? null, reason: `unknown command: ${command}; expected one of ${Object.keys(COMMANDS).join(", ")}` });
    return 2;
  }
  let flags;
  try {
    flags = parseArgs(argv.slice(1));
  } catch (err) {
    emit({ ok: false, command, reason: err.message });
    return 2;
  }
  try {
    const { exit, json } = handler(flags, {});
    emit(json);
    return exit;
  } catch (err) {
    if (err instanceof UsageError) {
      emit({ ok: false, command, reason: err.message });
      return 2;
    }
    emit({ ok: false, command, reason: err.message });
    return 1;
  }
}
