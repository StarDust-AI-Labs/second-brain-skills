// Hub 运行台账与状态机。台账是单次运行的唯一可审计事实源。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const STATES = [
  "INIT", "CONFIG_CHECKED", "INTENT_CLASSIFIED", "CONTRACT_LOADED",
  "MAP_CARD_EMITTED", "EXECUTING", "PREFLIGHTED", "WRITE_COMMITTED",
  "COMPLETION_CARD_EMITTED",
];

// 写入必经 PREFLIGHTED；只读/诊断场景可从 EXECUTING 直达完成。
// WRITE_COMMITTED -> PREFLIGHTED 允许同一 run 内多轮 preflight→write（多文件写入）。
const TRANSITIONS = {
  INIT: ["CONFIG_CHECKED"],
  CONFIG_CHECKED: ["INTENT_CLASSIFIED"],
  INTENT_CLASSIFIED: ["CONTRACT_LOADED"],
  CONTRACT_LOADED: ["MAP_CARD_EMITTED"],
  MAP_CARD_EMITTED: ["EXECUTING", "PREFLIGHTED"],
  EXECUTING: ["PREFLIGHTED", "COMPLETION_CARD_EMITTED"],
  PREFLIGHTED: ["WRITE_COMMITTED", "COMPLETION_CARD_EMITTED"],
  WRITE_COMMITTED: ["PREFLIGHTED", "COMPLETION_CARD_EMITTED"],
  COMPLETION_CARD_EMITTED: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function transition(ledger, to, { at = new Date(), note = "" } = {}) {
  if (!STATES.includes(to)) throw new Error(`unknown state: ${to}`);
  if (!canTransition(ledger.state, to)) {
    throw new Error(`illegal transition ${ledger.state} -> ${to}`);
  }
  ledger.state = to;
  ledger.updated_at = at.toISOString();
  ledger.events.push({
    at: at.toISOString(),
    type: "transition",
    detail: `to ${to}${note ? ` (${note})` : ""}`,
  });
  return ledger;
}

export function recordEvent(ledger, type, detail, at = new Date()) {
  ledger.updated_at = at.toISOString();
  ledger.events.push({ at: at.toISOString(), type, detail });
  return ledger;
}

export function newRunId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `run-${stamp}-${crypto.randomBytes(3).toString("hex")}`;
}

export function createLedger({ runId, storageMode = null, storagePath = null, storageName = null, now = new Date() }) {
  return {
    schema_version: "1.1",
    run_id: runId,
    scene: null,
    scene_label: null,
    user_text: null,
    storage_mode: storageMode,
    storage_path: storagePath,
    storage_name: storageName,
    state: "INIT",
    steps: { required_chain: [], completed: [], skipped: {}, outputs: {} },
    preflight: {
      checked: false, gates: {}, write_allowed: false, write_token: null,
      target_path: null, source_path: null, template_path: null,
      confirmation_token: null, operation: null, preview_hash: null, write_cycle: null,
      snapshot_hash: null, source_sha256: null,
    },
    // 每轮 preflight→write 一个周期：
    // awaiting_confirmation=第一阶段已出快照待用户确认；pending=已签发可执行令牌待 write。
    write_cycles: [],
    commit: { committed: false, receipt: null },
    writes: [],
    blocked_reason: null,
    events: [],
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

// awaiting_confirmation：危险操作第一阶段，已有 Runtime 快照但没有可执行令牌。
// pending：已签发 write_token/confirmation_token，等待 write 结算。
// committed：已结算；rejected：失败或未通过校验，仅作审计。
const CYCLE_STATES = ["pending", "awaiting_confirmation", "committed", "rejected"];

export function newCycleId() {
  return `cyc-${crypto.randomBytes(6).toString("hex")}`;
}

export function previewHashOf(text) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify(value ?? null);
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export function createWriteCycle({
  id, operation, sourcePath = null, targetPath = null, preview = null,
  previewHash = null, sourceSha256 = null, size = null, snapshotHash = null,
  writeToken = null, confirmationToken = null, confirmationChallenge = null,
  gates = {}, state = "pending", now = new Date(),
}) {
  if (!CYCLE_STATES.includes(state)) throw new Error(`unknown cycle state: ${state}`);
  return {
    id,
    operation,
    source_path: sourcePath ?? null,
    target_path: targetPath ?? null,
    // preview/preview_hash 只表示展示给用户的文本；文件快照由 source_sha256/size/snapshot_hash 表达。
    preview: preview ?? null,
    preview_hash: previewHash ?? null,
    source_sha256: sourceSha256 ?? null,
    size: size ?? null,
    snapshot_hash: snapshotHash ?? null,
    write_token: writeToken,
    confirmation_token: confirmationToken ?? null,
    confirmation_challenge: confirmationChallenge ?? null,
    confirmation_challenge_used: false,
    confirmation_used: false,
    gates,
    receipt: null,
    state,
    created_at: now.toISOString(),
    settled_at: null,
  };
}

export function findCycle(ledger, cycleId) {
  return (ledger?.write_cycles || []).find((c) => c.id === cycleId) ?? null;
}

export function currentCycle(ledger) {
  const cycles = ledger?.write_cycles || [];
  return cycles.length ? cycles[cycles.length - 1] : null;
}

export function pendingCycle(ledger) {
  const cycle = currentCycle(ledger);
  return cycle && cycle.state === "pending" ? cycle : null;
}

export function runsDir(stateDir) {
  return path.join(stateDir, "hub-runs");
}

export function ledgerPath(stateDir, runId) {
  if (!/^run-\d{14}-[0-9a-f]{6}$/.test(runId || "")) throw new Error("invalid run_id");
  return path.join(runsDir(stateDir), `${runId}.json`);
}

export function saveLedger(stateDir, ledger) {
  fs.mkdirSync(runsDir(stateDir), { recursive: true });
  const file = ledgerPath(stateDir, ledger.run_id);
  const temp = path.join(runsDir(stateDir), `.${ledger.run_id}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(ledger, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temp, file);
  return file;
}

export function loadLedger(stateDir, runId) {
  let file;
  try { file = ledgerPath(stateDir, runId); } catch { throw new Error(`run not found: ${runId}`); }
  if (!fs.existsSync(file)) throw new Error(`run not found: ${runId}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
