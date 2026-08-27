// Hub Runtime 命令编排。输出 JSON；退出码：0 成功，1 门禁拒绝/验证失败，2 用法错误或阻塞。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  createLedger, newRunId, transition, recordEvent, saveLedger, loadLedger,
} from "./state.mjs";
import { loadContracts, getScene, requiredChain, isWriteMode } from "./contracts.mjs";
import { evaluatePreflight, checkWriteGate, validateCompletion, realPathInsideRoot, gateTemplate } from "./gates.mjs";
import { renderMapCard, renderCompletionCard } from "./render.mjs";

const BOOL_FLAGS = new Set(["skip", "help", "confirm"]);

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

// 旧版平铺结构（workspaceType/vaultPath 等顶层字段）自动迁移到 preferences 嵌套结构。
function migrateLegacyConfig(stateDir, raw) {
  if (!raw || typeof raw !== "object" || !raw.workspaceType) return raw;
  const prefs = raw.preferences || {};
  const vault = raw.vaultPath || raw.workspacePath || prefs.vault_path || prefs.workspace_path || null;
  const mode = ["obsidian", "markdown"].includes(raw.workspaceType) ? raw.workspaceType : null;
  if (!vault || !mode) return raw; // 无法迁移时交由后续校验失败关闭
  const name = raw.vaultName || raw.workspaceName || prefs.vault_name || prefs.workspace_name || path.basename(vault);
  raw.preferences = {
    ...prefs,
    storage_mode: mode,
    workspace_path: vault,
    workspace_name: name,
    vault_path: vault,
    vault_name: name,
  };
  try {
    fs.writeFileSync(path.join(stateDir, "hub-state.json"), `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  } catch { /* 迁移写回失败时按只读处理，由 readConfig 后续校验兜底 */ }
  return raw;
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
  raw = migrateLegacyConfig(stateDir, raw);
  const prefs = raw.preferences || {};
  const mode = prefs.storage_mode;
  if (!["obsidian", "markdown"].includes(mode)) {
    return { config_ok: false, reason: "storage_mode must be obsidian or markdown", storage_mode: mode ?? null, storage_path: null, storage_name: null };
  }
  const p = mode === "obsidian" ? prefs.vault_path : prefs.workspace_path;
  const name = mode === "obsidian" ? prefs.vault_name : prefs.workspace_name;
  let validDir = false;
  try { validDir = Boolean(p && fs.existsSync(p) && fs.statSync(p).isDirectory() && !fs.lstatSync(p).isSymbolicLink()); } catch { validDir = false; }
  if (!p || !name || !path.isAbsolute(p) || !validDir) {
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

// 所有现行写入契约中，写入能力都是最后一个必选步骤；它由运行时 write 结算。
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
      return reject(ledger, stateDir, now, `write step is settled by runtime write, not step: ${stepId}`);
    }
    const order = scene.step_order.indexOf(stepId);
    for (const earlier of scene.step_order.slice(0, order)) {
      if (!ledger.steps.completed.includes(earlier) && ledger.steps.skipped[earlier] === undefined) {
        return reject(ledger, stateDir, now, `out-of-order step: ${stepId} before ${earlier}`);
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
  // WRITE_COMMITTED 允许再次 preflight：同一 run 内多轮 preflight→write（多文件写入）。
  if (!["MAP_CARD_EMITTED", "EXECUTING", "WRITE_COMMITTED"].includes(ledger.state)) {
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
  const sourcePath = flags["source-path"] ?? (getScene(contracts.route, ledger.scene).mode === "move-or-delete" ? targetPath : null);
  const res = evaluatePreflight(ledger, scene, {
    targetPath, sourcePath, templateContent, templatePath: flags["template-file"] ?? null, auth: Boolean(flags.confirm),
  });
  ledger.preflight = {
    checked: true, gates: res.gates, write_allowed: res.write_allowed, write_token: res.write_token,
    target_path: targetPath, source_path: sourcePath, template_path: flags["template-file"] ?? ledger.preflight.template_path,
    confirmation_token: res.write_allowed && scene.mode === "move-or-delete" && flags.confirm
      ? crypto.randomBytes(8).toString("hex") : null,
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

function readWriteContent(flags) {
  if (flags["content-file"]) {
    if (!fs.existsSync(flags["content-file"])) throw new Error("content file not found");
    return fs.readFileSync(flags["content-file"], "utf8");
  }
  return flags.content ?? null;
}

// 写入由 Runtime 实际执行：门禁 + 真实路径双重校验 + 内容结构校验 + 前后哈希回执。
// 同一 run 可多轮 preflight→write；每轮 write 前都重新校验真实路径，防 TOCTOU。
export function cmdWrite(flags, { contracts = loadContracts(), now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  const gate = checkWriteGate(ledger, { token: flags.token ?? null, targetPath: flags["target-path"] ?? null });
  if (!gate.allowed) return reject(ledger, stateDir, now, gate.reason);
  if (ledger.state !== "PREFLIGHTED") return reject(ledger, stateDir, now, `cannot write in state ${ledger.state}`);
  const scene = getScene(contracts.route, ledger.scene);
  const operation = flags.operation || (scene.mode === "move-or-delete" ? "move" : "create");
  const target = path.resolve(flags["target-path"] ?? ledger.preflight.target_path ?? "");
  const source = flags["source-path"] ? path.resolve(flags["source-path"]) : null;
  const targetSafety = realPathInsideRoot(ledger.storage_path, target);
  if (!targetSafety.pass) return reject(ledger, stateDir, now, targetSafety.reason);
  if (source) {
    const sourceSafety = realPathInsideRoot(ledger.storage_path, source);
    if (!sourceSafety.pass) return reject(ledger, stateDir, now, sourceSafety.reason);
  }
  const before = (p) => p && fs.existsSync(p) ? fs.readFileSync(p) : null;
  let beforeTarget = before(target);
  try {
    if (operation === "create" || operation === "edit") {
      const content = readWriteContent(flags);
      if (content === null) return reject(ledger, stateDir, now, "write requires --content or --content-file");
      // 实际写入内容必须通过与 preflight 模板相同的结构校验，防止模板与内容脱钩。
      const contentGate = gateTemplate(content, null);
      if (!contentGate.pass) return reject(ledger, stateDir, now, `write content rejected: ${contentGate.reason}`);
      if (operation === "create" && fs.existsSync(target)) return reject(ledger, stateDir, now, "create target already exists");
      if (operation === "edit" && !fs.existsSync(target)) return reject(ledger, stateDir, now, "edit target missing");
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
    } else if (operation === "move") {
      if (!source || !fs.existsSync(source)) return reject(ledger, stateDir, now, "move source missing");
      if (fs.existsSync(target)) return reject(ledger, stateDir, now, "move destination already exists");
      fs.renameSync(source, target);
    } else if (operation === "delete") {
      if (!flags.confirmation || flags.confirmation !== ledger.preflight.confirmation_token) {
        return reject(ledger, stateDir, now, "delete requires explicit confirmation token");
      }
      if (!fs.existsSync(target)) return reject(ledger, stateDir, now, "delete target missing");
      fs.unlinkSync(target);
    } else return reject(ledger, stateDir, now, `unsupported write operation: ${operation}`);
  } catch (err) { return reject(ledger, stateDir, now, `write failed: ${err.message}`); }
  const after = before(target);
  const id = crypto.randomBytes(8).toString("hex");
  const writeRecord = {
    id, operation, source_path: source, target_path: target,
    before_sha256: beforeTarget ? crypto.createHash("sha256").update(beforeTarget).digest("hex") : null,
    after_sha256: after ? crypto.createHash("sha256").update(after).digest("hex") : null,
    at: now.toISOString(),
  };
  ledger.write = writeRecord;
  ledger.writes = [...(ledger.writes || []), writeRecord];
  const receipt = { ok: true, runtime_write_id: id, tool: "hub-runtime", operation, path: target, at: now.toISOString() };
  transition(ledger, "WRITE_COMMITTED", { at: now });
  const writeStep = writeStepOf(scene);
  if (writeStep && !ledger.steps.completed.includes(writeStep)) ledger.steps.completed.push(writeStep);
  // 写入路径自动登记为运行输出，打通 finish 完成验证（target_path 为写场景契约必需输出）。
  if (!ledger.steps.outputs.target_path || ledger.steps.outputs.target_path !== target) {
    ledger.steps.outputs.target_path = target;
    recordEvent(ledger, "output", `target_path=${target}`, now);
  }
  if (source && ledger.steps.outputs.source_path !== source) {
    ledger.steps.outputs.source_path = source;
    recordEvent(ledger, "output", `source_path=${source}`, now);
  }
  ledger.commit = { committed: true, receipt };
  for (const [key, value] of Object.entries(flags.output)) {
    ledger.steps.outputs[key] = value;
    recordEvent(ledger, "output", `${key}=${value}`, now);
  }
  recordEvent(ledger, "write-committed", `${operation}: ${target}`, now);
  saveLedger(stateDir, ledger);
  return { exit: 0, json: { ok: true, command: "write", run_id: ledger.run_id, state: ledger.state, receipt, card: renderMapCard(ledger, scene) } };
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
  write: cmdWrite, gate: cmdGate, finish: cmdFinish, status: cmdStatus,
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
