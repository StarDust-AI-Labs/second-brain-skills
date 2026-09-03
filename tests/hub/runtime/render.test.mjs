import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createLedger } from "../../../skills/second-brain-hub/scripts/hub-runtime/state.mjs";
import { loadContracts, getScene } from "../../../skills/second-brain-hub/scripts/hub-runtime/contracts.mjs";
import { renderMapCard, renderCompletionCard } from "../../../skills/second-brain-hub/scripts/hub-runtime/render.mjs";
import { SKILL_ROOT } from "./helpers.mjs";

const { route } = loadContracts(SKILL_ROOT);
const NOW = new Date("2026-08-23T00:00:00Z");

function ledgerFor(sceneId, storagePath = "/vault") {
  const scene = getScene(route, sceneId);
  const ledger = createLedger({ runId: "run-render", storageMode: "markdown", storagePath, now: NOW });
  ledger.scene = sceneId;
  ledger.scene_label = scene.intent;
  ledger.steps.required_chain = [...scene.required_steps];
  return { ledger, scene };
}

test("初始地图卡：全未开始，含运行编号/场景/写入权限", () => {
  const { ledger, scene } = ledgerFor("inspiration");
  const card = renderMapCard(ledger, scene);
  assert.match(card, /【灵感速记】步骤 1\/4/);
  assert.match(card, /run: run-render/);
  assert.match(card, /write_allowed=false/);
  assert.match(card, /⬜ 1 确认归属/);
  assert.equal(card.includes("▶"), false);
});

test("进度地图卡：已完成/跳过/进行中/未开始", () => {
  const { ledger, scene } = ledgerFor("inspiration");
  // 先跳过条件步骤（价值判断），再完成第一步（确认归属），
  // 则"进行中"指针应推进到渲染模板。
  ledger.steps.skipped["capture-criteria"] = "灵感自带个人价值，用户未表达保留犹豫";
  ledger.steps.completed.push("hub.target-routing");
  ledger.steps.outputs["hub.target-routing"] = "→ 📂 资源";
  const card = renderMapCard(ledger, scene);
  assert.match(card, /步骤 3\/4/);
  assert.match(card, /✅ 1 确认归属\s+→ → 📂 资源/);
  assert.match(card, /⤳ 2 价值判断 已跳过/);
  assert.match(card, /▶ 3 渲染模板\s+← 进行中/);
  assert.match(card, /⬜ 4 写入归档/);
});

test("条件步骤跳过显示 ⤳ 与跳过证据", () => {
  const { ledger, scene } = ledgerFor("inspiration");
  ledger.steps.skipped["capture-criteria"] = "灵感自带个人价值，用户未表达保留犹豫";
  const card = renderMapCard(ledger, scene);
  assert.match(card, /⤳ .*价值判断 已跳过/);
  assert.match(card, /灵感自带个人价值/);
});

test("阻塞显示 ❌ 与阻塞原因，且不继续后续步骤", () => {
  const { ledger, scene } = ledgerFor("inspiration");
  ledger.blocked_reason = "obsidian-cli 不可用且无法降级";
  const card = renderMapCard(ledger, scene);
  assert.match(card, /❌ 1 确认归属/);
  assert.match(card, /obsidian-cli 不可用且无法降级/);
  assert.match(card, /阻塞/);
});

test("写入权限在 preflight 通过后显示 true", () => {
  const { ledger, scene } = ledgerFor("inspiration");
  ledger.preflight.write_allowed = true;
  const card = renderMapCard(ledger, scene);
  assert.match(card, /write_allowed=true/);
});

test("地图卡预算：≤400 字符（单卡）", () => {
  for (const sceneId of ["inspiration", "external-save", "distill", "create", "inbox", "review", "query", "diagnosis"]) {
    const { ledger, scene } = ledgerFor(sceneId);
    const card = renderMapCard(ledger, scene);
    assert.ok(card.length <= 400, `${sceneId} card too long: ${card.length}`);
  }
});

test("完成卡：全部结算，写场景含位置", () => {
  const { ledger, scene } = ledgerFor("inspiration");
  ledger.steps.completed = [...scene.required_steps];
  ledger.commit = { committed: true, receipt: { ok: true, path: path.join("/vault", "📥 收件箱", "a.md") } };
  const card = renderCompletionCard(ledger, scene, { result: "已保存灵感笔记" });
  assert.match(card, /已完成 4\/4/);
  assert.match(card, /【完成】已保存灵感笔记/);
  assert.match(card, /【位置】/);
});

test("只读/诊断完成卡省略位置", () => {
  const { ledger, scene } = ledgerFor("query");
  ledger.steps.completed = [...scene.required_steps];
  const card = renderCompletionCard(ledger, scene, { result: "找到 3 条笔记" });
  assert.equal(card.includes("【位置】"), false);
});
