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
    schema_version: "1.0",
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
      target_path: null, template_path: null,
    },
    commit: { committed: false, receipt: null },
    writes: [],
    blocked_reason: null,
    events: [],
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
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
