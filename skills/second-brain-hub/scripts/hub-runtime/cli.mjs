// Hub Runtime 命令编排。输出 JSON；退出码：0 成功，1 门禁拒绝/验证失败，2 用法错误或阻塞。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  createLedger, newRunId, transition, recordEvent, saveLedger, loadLedger,
  createWriteCycle, newCycleId, previewHashOf, pendingCycle, currentCycle, findCycle,
} from "./state.mjs";
import { loadContracts, getScene, requiredChain, isWriteMode } from "./contracts.mjs";
import {
  evaluatePreflight, checkWriteGate, validateCompletion, realPathInsideRoot, gateTemplate,
  OPERATIONS, DANGEROUS_OPERATIONS, allowedOperations, defaultOperation,
  readFileSnapshot, renderCanonicalPreview, snapshotFields, snapshotHashOf, fileExcerpt,
} from "./gates.mjs";
import { renderMapCard, renderCompletionCard } from "./render.mjs";

// confirm 不再是布尔授权开关：危险操作必须走 preflight → confirm 两阶段。
const BOOL_FLAGS = new Set(["skip", "help"]);

// 确认令牌绑定运行、周期、操作、规范化源/目标、文件 SHA、快照与预览指纹。
function confirmationTokenFor({ runId, cycleId, operation, sourcePath, targetPath, sourceSha256, snapshotHash, previewHash }) {
  return crypto.createHash("sha256")
    .update([
      runId, cycleId, operation,
      sourcePath ? path.resolve(sourcePath) : "",
      targetPath ? path.resolve(targetPath) : "",
      sourceSha256 ?? "", snapshotHash ?? "", previewHash ?? "",
      crypto.randomBytes(8).toString("hex"),
    ].join("|"), "utf8")
    .digest("hex").slice(0, 32);
}

export class UsageError extends Error {}

export function parseArgs(argv) {
  const flags = { _: [], output: {}, present: new Set() };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--output") {
      const kv = argv[i += 1] ?? "";
      const eq = kv.indexOf("=");
      if (eq <= 0) throw new UsageError(`--output needs key=value, got: ${kv}`);
      flags.output[kv.slice(0, eq)] = kv.slice(eq + 1);
    } else if (a.startsWith("--")) {
      const name = a.slice(2);
      flags.present.add(name);
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
  // WRITE_COMMITTED / PREFLIGHTED 允许再次 preflight：同一 run 内多轮 preflight→write，
  // 或危险操作重新预览（文件变化后重新走两阶段）。
  if (!["MAP_CARD_EMITTED", "EXECUTING", "PREFLIGHTED", "WRITE_COMMITTED"].includes(ledger.state)) {
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
  // 授权必须绑定到完整操作快照：operation + source_path + target_path + Runtime 文件快照。
  const operation = flags.operation ?? defaultOperation(scene);
  if (!OPERATIONS.includes(operation)) {
    return reject(ledger, stateDir, now, `unsupported operation: ${operation}; expected one of ${OPERATIONS.join(", ")}`);
  }
  if (!allowedOperations(scene).includes(operation)) {
    return reject(ledger, stateDir, now, `operation not allowed for scene ${scene.id}: ${operation}`);
  }
  // --preview/--preview-hash 不再作为授权依据，文件快照一律由 Runtime 生成。
  if (DANGEROUS_OPERATIONS.has(operation)
    && (flags.present.has("preview") || flags.present.has("preview-file") || flags.present.has("preview-hash"))) {
    return reject(ledger, stateDir, now,
      "preview is generated by Runtime from the real file; --preview/--preview-file/--preview-hash are not accepted");
  }
  if (flags.present.has("confirm")) {
    return reject(ledger, stateDir, now,
      "--confirm is not accepted in preflight; dangerous operations use the two-phase preflight → confirm flow");
  }
  const targetPath = flags["target-path"] ?? ledger.preflight.target_path;
  const needsSource = operation === "move" || operation === "delete";
  // delete 只操作一个明确路径：未给 source 时等于 target，给出则必须解析后相同。
  const sourcePath = flags["source-path"] ?? (needsSource ? targetPath : null);
  if (operation === "move" && !flags["source-path"]) {
    return reject(ledger, stateDir, now, "move requires --source-path");
  }
  if (operation === "move" && sourcePath && targetPath
    && path.resolve(sourcePath) === path.resolve(targetPath)) {
    return reject(ledger, stateDir, now, "move source and target must differ");
  }
  const deletePathsAligned = operation !== "delete"
    || !flags["source-path"]
    || (targetPath && path.resolve(sourcePath) === path.resolve(targetPath));
  // Runtime 读取真实源文件生成快照（存在性、普通文件、SHA-256、大小）。
  let fileSnapshot = null;
  let preview = null;
  let previewHash = null;
  let snapshotHash = null;
  if (DANGEROUS_OPERATIONS.has(operation)) {
    fileSnapshot = readFileSnapshot(sourcePath);
    if (fileSnapshot.pass) {
      preview = renderCanonicalPreview({
        operation,
        sourcePath: path.resolve(sourcePath),
        targetPath: path.resolve(targetPath),
        sha256: fileSnapshot.sha256,
        size: fileSnapshot.size,
        excerpt: fileExcerpt(sourcePath),
      });
      previewHash = previewHashOf(preview);
      snapshotHash = snapshotHashOf(snapshotFields({
        operation,
        sourcePath,
        targetPath,
        sourceSha256: fileSnapshot.sha256,
        size: fileSnapshot.size,
        previewHash,
      }));
    }
  }
  const res = evaluatePreflight(ledger, scene, {
    targetPath, sourcePath, templateContent, templatePath: flags["template-file"] ?? null,
    operation, fileSnapshot, deletePathsAligned,
  });
  // 每次 preflight 都是一个新周期：
  // 危险操作第一阶段为 awaiting_confirmation（不签发可执行令牌）；其他操作为 pending；失败为 rejected。
  const cycleId = newCycleId();
  const isDangerous = DANGEROUS_OPERATIONS.has(operation);
  const cycleState = !res.write_allowed ? "rejected" : (isDangerous ? "awaiting_confirmation" : "pending");
  const challenge = res.write_allowed && isDangerous ? crypto.randomBytes(16).toString("hex") : null;
  const cycle = createWriteCycle({
    id: cycleId, operation, sourcePath, targetPath, preview, previewHash,
    sourceSha256: fileSnapshot?.sha256 ?? null,
    size: fileSnapshot?.size ?? null,
    snapshotHash,
    writeToken: res.write_allowed && !isDangerous ? res.write_token : null,
    confirmationChallenge: challenge,
    gates: res.gates,
    state: cycleState, now,
  });
  ledger.write_cycles = [...(ledger.write_cycles || []), cycle];
  if (res.write_allowed) {
    // 新的授权作废旧周期（pending/awaiting_confirmation），保留审计但不阻塞后续完成。
    for (const older of ledger.write_cycles) {
      if (older.id !== cycleId && (older.state === "pending" || older.state === "awaiting_confirmation")) {
        older.state = "rejected";
        older.settled_at = now.toISOString();
        recordEvent(ledger, "cycle-superseded", `${older.id} superseded by ${cycleId}`, now);
      }
    }
    // 新一轮授权作废上一轮提交状态，杜绝沿用旧 committed 完成流程。
    ledger.commit = { committed: false, receipt: null };
    ledger.preflight = {
      checked: true, gates: res.gates, write_allowed: true,
      write_token: cycle.write_token,
      target_path: targetPath, source_path: sourcePath,
      template_path: flags["template-file"] ?? ledger.preflight.template_path,
      confirmation_token: null, operation, preview_hash: previewHash,
      snapshot_hash: snapshotHash, source_sha256: fileSnapshot?.sha256 ?? null,
      write_cycle: cycleId,
    };
    if (ledger.state !== "PREFLIGHTED") transition(ledger, "PREFLIGHTED", { at: now });
    recordEvent(ledger, "preflight", `cycle=${cycleId} operation=${operation} state=${cycleState} snapshot=${snapshotHash ?? "-"}`, now);
  } else {
    // 失败仅作审计：不覆盖此前成功的 preflight/commit 状态，避免已完成写入的 run 无法 finish。
    recordEvent(ledger, "preflight-rejected", `cycle=${cycleId} operation=${operation} gates=${JSON.stringify(res.gates)}`, now);
  }
  saveLedger(stateDir, ledger);
  return {
    exit: res.write_allowed ? 0 : 1,
    json: {
      ok: res.write_allowed, command: "preflight", run_id: ledger.run_id, state: ledger.state,
      write_allowed: res.write_allowed,
      // 危险操作第一阶段不签发可执行令牌，只有 challenge
      write_token: cycle.write_token,
      confirmation_token: cycle.confirmation_token,
      confirmation_challenge: challenge,
      gates: res.gates,
      operation, source_path: sourcePath ?? null, target_path: targetPath ?? null,
      write_cycle: cycleId, cycle_state: cycleState,
      preview: isDangerous ? preview : null,
      preview_hash: previewHash ?? null,
      source_sha256: fileSnapshot?.sha256 ?? null,
      size: fileSnapshot?.size ?? null,
      snapshot_hash: snapshotHash ?? null,
      // 危险操作：必须先向用户展示 preview，再执行 confirm 取得令牌
      next: res.write_allowed && isDangerous ? "confirm" : "write",
      card: renderMapCard(ledger, scene),
    },
  };
}

// 二阶段确认：只有当调用方回传 challenge 时才签发一次性 write_token + confirmation_token。
// 令牌只证明「这组快照已被确认」，不证明确认来自真人——协议要求 Agent 收到用户新消息后才调用。
export function cmdConfirm(flags, { now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  if (ledger.blocked_reason) return reject(ledger, stateDir, now, `blocked: ${ledger.blocked_reason}`);
  const cycleId = flags.cycle;
  if (!cycleId) return reject(ledger, stateDir, now, "confirm requires --cycle <write_cycle>");
  const cycle = findCycle(ledger, cycleId);
  if (!cycle) return reject(ledger, stateDir, now, `unknown write cycle: ${cycleId}`);
  if (cycle.state !== "awaiting_confirmation") {
    return reject(ledger, stateDir, now, `cycle ${cycleId} is not awaiting confirmation (state=${cycle.state})`);
  }
  if (cycle.confirmation_challenge_used) {
    return reject(ledger, stateDir, now, `confirmation challenge already used: ${cycleId}`);
  }
  if (!flags.challenge || flags.challenge !== cycle.confirmation_challenge) {
    return reject(ledger, stateDir, now, "invalid confirmation challenge");
  }
  const writeToken = crypto.randomBytes(8).toString("hex");
  const confirmationToken = confirmationTokenFor({
    runId: ledger.run_id, cycleId: cycle.id, operation: cycle.operation,
    sourcePath: cycle.source_path, targetPath: cycle.target_path,
    sourceSha256: cycle.source_sha256, snapshotHash: cycle.snapshot_hash,
    previewHash: cycle.preview_hash,
  });
  cycle.confirmation_challenge_used = true;
  cycle.write_token = writeToken;
  cycle.confirmation_token = confirmationToken;
  cycle.state = "pending";
  ledger.preflight.confirmation_token = confirmationToken;
  ledger.preflight.write_token = writeToken;
  recordEvent(ledger, "confirm", `cycle=${cycle.id} operation=${cycle.operation} tokens issued`, now);
  saveLedger(stateDir, ledger);
  return {
    exit: 0,
    json: {
      ok: true, command: "confirm", run_id: ledger.run_id, state: ledger.state,
      write_cycle: cycle.id, cycle_state: cycle.state, operation: cycle.operation,
      write_token: writeToken, confirmation_token: confirmationToken,
      source_path: cycle.source_path, target_path: cycle.target_path,
      source_sha256: cycle.source_sha256, snapshot_hash: cycle.snapshot_hash,
      preview_hash: cycle.preview_hash, next: "write",
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
  const scene = getScene(contracts.route, ledger.scene);
  const requestedOperation = flags.operation ?? null;
  const gate = checkWriteGate(ledger, {
    token: flags.token ?? null,
    targetPath: flags["target-path"] ?? null,
    sourcePath: flags["source-path"] ?? null,
    operation: requestedOperation,
  });
  if (!gate.allowed) return reject(ledger, stateDir, now, gate.reason);
  if (ledger.state !== "PREFLIGHTED") return reject(ledger, stateDir, now, `cannot write in state ${ledger.state}`);
  const cycle = pendingCycle(ledger);
  // 操作以 preflight 快照为准：create 令牌不得用于 edit/move/delete。
  const operation = cycle.operation;
  if (requestedOperation && requestedOperation !== operation) {
    return reject(ledger, stateDir, now, `operation not authorized by preflight: ${requestedOperation} (authorized: ${operation})`);
  }
  const target = path.resolve(flags["target-path"] ?? cycle.target_path ?? "");
  if (!cycle.target_path || path.resolve(cycle.target_path) !== target) {
    return reject(ledger, stateDir, now, "target differs from preflight-approved path");
  }
  // 源路径逐项核对：move 必须有源且与快照一致，其他操作不得夹带未批准源。
  const requestedSource = flags["source-path"] ? path.resolve(flags["source-path"]) : null;
  if (operation === "move") {
    if (!requestedSource) return reject(ledger, stateDir, now, "move requires --source-path");
    if (!cycle.source_path || path.resolve(cycle.source_path) !== requestedSource) {
      return reject(ledger, stateDir, now, "source differs from preflight-approved path");
    }
  } else if (requestedSource) {
    if (!cycle.source_path || path.resolve(cycle.source_path) !== requestedSource) {
      return reject(ledger, stateDir, now, "source differs from preflight-approved path");
    }
  }
  const source = cycle.source_path ? path.resolve(cycle.source_path) : null;
  // 危险操作：确认令牌必须由二阶段 confirm 签发、未使用且与快照绑定一致。
  if (DANGEROUS_OPERATIONS.has(operation)) {
    if (!flags.confirmation) {
      return reject(ledger, stateDir, now, `${operation} requires confirmation token from the confirm command`);
    }
    if (cycle.confirmation_used) {
      return reject(ledger, stateDir, now, "confirmation token already used");
    }
    if (!cycle.confirmation_token || flags.confirmation !== cycle.confirmation_token) {
      return reject(ledger, stateDir, now, "invalid confirmation token");
    }
    // 写前重新读取真实文件计算 SHA-256：文件在确认后发生变化必须重新预览与确认。
    const live = readFileSnapshot(source);
    if (!live.pass) {
      cycle.state = "rejected";
      return reject(ledger, stateDir, now, `source changed or unreadable since preflight: ${live.reason}; re-run preflight and confirm`);
    }
    if (live.sha256 !== cycle.source_sha256 || live.size !== cycle.size) {
      cycle.state = "rejected";
      return reject(ledger, stateDir, now,
        `source changed since preflight (sha256 ${cycle.source_sha256} -> ${live.sha256}); re-run preflight and confirm`);
    }
  }
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
      if (!fs.existsSync(target)) return reject(ledger, stateDir, now, "delete target missing");
      fs.unlinkSync(target);
    } else return reject(ledger, stateDir, now, `unsupported write operation: ${operation}`);
  } catch (err) { return reject(ledger, stateDir, now, `write failed: ${err.message}`); }
  const after = before(target);
  const id = crypto.randomBytes(8).toString("hex");
  const writeRecord = {
    id, operation, source_path: source, target_path: target,
    // 危险操作记录移动/删除前的真实源文件 SHA-256
    source_sha256: cycle.source_sha256 ?? null,
    snapshot_hash: cycle.snapshot_hash ?? null,
    before_sha256: beforeTarget ? crypto.createHash("sha256").update(beforeTarget).digest("hex") : null,
    after_sha256: after ? crypto.createHash("sha256").update(after).digest("hex") : null,
    at: now.toISOString(),
  };
  ledger.write = writeRecord;
  ledger.writes = [...(ledger.writes || []), writeRecord];
  // 回执与 preflight 快照一致：operation / source / target / preview_hash / source_sha256 / snapshot_hash。
  const receipt = {
    ok: true, runtime_write_id: id, tool: "hub-runtime", operation,
    path: target, target_path: target, source_path: source,
    source_sha256: cycle.source_sha256 ?? null,
    snapshot_hash: cycle.snapshot_hash ?? null,
    preview_hash: cycle.preview_hash ?? null, write_cycle: cycle.id,
    at: now.toISOString(),
  };
  // 结算当前周期：确认令牌一次性失效，回执写入周期供完成验证核对。
  cycle.confirmation_used = DANGEROUS_OPERATIONS.has(operation);
  cycle.state = "committed";
  cycle.settled_at = now.toISOString();
  cycle.receipt = receipt;
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
  recordEvent(ledger, "write-committed", `cycle=${cycle.id} ${operation}: ${target}`, now);
  saveLedger(stateDir, ledger);
  return { exit: 0, json: { ok: true, command: "write", run_id: ledger.run_id, state: ledger.state, receipt, write_cycle: cycle.id, card: renderMapCard(ledger, scene) } };
}

export function cmdGate(flags, { now = new Date() } = {}) {
  const { stateDir, ledger } = loadRun(flags);
  const gate = checkWriteGate(ledger, {
    token: flags.token ?? null,
    targetPath: flags["target-path"] ?? null,
    sourcePath: flags["source-path"] ?? null,
    operation: flags.operation ?? null,
  });
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
  confirm: cmdConfirm, write: cmdWrite, gate: cmdGate, finish: cmdFinish, status: cmdStatus,
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
