import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  STATES, canTransition, transition, createLedger, newRunId,
  saveLedger, loadLedger, recordEvent,
} from "../../../skills/second-brain-hub/scripts/hub-runtime/state.mjs";

test("状态全集与文档一致", () => {
  assert.deepEqual(STATES, [
    "INIT", "CONFIG_CHECKED", "INTENT_CLASSIFIED", "CONTRACT_LOADED",
    "MAP_CARD_EMITTED", "EXECUTING", "PREFLIGHTED", "WRITE_COMMITTED",
    "COMPLETION_CARD_EMITTED",
  ]);
});

test("合法转移：写入主链", () => {
  assert.ok(canTransition("INIT", "CONFIG_CHECKED"));
  assert.ok(canTransition("MAP_CARD_EMITTED", "EXECUTING"));
  assert.ok(canTransition("EXECUTING", "PREFLIGHTED"));
  assert.ok(canTransition("PREFLIGHTED", "WRITE_COMMITTED"));
  assert.ok(canTransition("WRITE_COMMITTED", "COMPLETION_CARD_EMITTED"));
});

test("非法转移被拒绝", () => {
  assert.equal(canTransition("INIT", "WRITE_COMMITTED"), false);
  assert.equal(canTransition("MAP_CARD_EMITTED", "WRITE_COMMITTED"), false);
  assert.equal(canTransition("COMPLETION_CARD_EMITTED", "EXECUTING"), false);
});

test("transition 非法时抛错且不改变状态", () => {
  const ledger = createLedger({ runId: "run-x", now: new Date("2026-08-23T00:00:00Z") });
  assert.throws(() => transition(ledger, "WRITE_COMMITTED"), /illegal transition/);
  assert.equal(ledger.state, "INIT");
});

test("transition 记录事件流", () => {
  const ledger = createLedger({ runId: "run-x", now: new Date("2026-08-23T00:00:00Z") });
  transition(ledger, "CONFIG_CHECKED", { at: new Date("2026-08-23T00:00:01Z"), note: "markdown" });
  assert.equal(ledger.state, "CONFIG_CHECKED");
  assert.equal(ledger.events.length, 1);
  assert.match(ledger.events[0].detail, /to CONFIG_CHECKED/);
});

test("台账持久化往返一致", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-state-"));
  const ledger = createLedger({ runId: newRunId(new Date("2026-08-23T00:00:00Z")), now: new Date() });
  recordEvent(ledger, "note", "hello");
  const file = saveLedger(dir, ledger);
  assert.ok(file.includes("hub-runs"));
  const back = loadLedger(dir, ledger.run_id);
  assert.deepEqual(back, JSON.parse(fs.readFileSync(file, "utf8")));
  assert.equal(back.events[0].detail, "hello");
});

test("未知 run 读取失败", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-state-"));
  assert.throws(() => loadLedger(dir, "run-missing"), /run not found/);
});

test("run id 含时间戳且唯一", () => {
  const a = newRunId(new Date("2026-08-23T01:02:03Z"));
  const b = newRunId(new Date("2026-08-23T01:02:03Z"));
  assert.match(a, /^run-20260823010203-[0-9a-f]{6}$/);
  assert.notEqual(a, b);
});
