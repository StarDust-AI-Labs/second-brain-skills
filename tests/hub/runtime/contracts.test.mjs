import test from "node:test";
import assert from "node:assert/strict";
import { loadContracts, getScene, requiredChain, conditionalIds, isWriteMode }
  from "../../../skills/second-brain-hub/scripts/hub-runtime/contracts.mjs";
import { SKILL_ROOT } from "./helpers.mjs";

test("读取真实生产契约", () => {
  const { route, capability } = loadContracts(SKILL_ROOT);
  assert.equal(route.scenes.length, 8);
  assert.ok(capability.capabilities.length >= 10);
});

test("场景解析与未知场景拒绝", () => {
  const { route } = loadContracts(SKILL_ROOT);
  assert.equal(getScene(route, "inspiration").intent, "灵感速记");
  assert.throws(() => getScene(route, "nope"), /unknown scene/);
});

test("必选链与条件步骤取自契约", () => {
  const { route } = loadContracts(SKILL_ROOT);
  const create = getScene(route, "create");
  assert.deepEqual(requiredChain(create), create.required_steps);
  assert.deepEqual(conditionalIds(create).sort(), ["diverge-converge", "progressive-summarization(L2)"]);
});

test("写入模式判定", () => {
  const { route } = loadContracts(SKILL_ROOT);
  assert.equal(isWriteMode(getScene(route, "inspiration")), true);
  assert.equal(isWriteMode(getScene(route, "distill")), true);
  assert.equal(isWriteMode(getScene(route, "inbox")), true);
  assert.equal(isWriteMode(getScene(route, "query")), false);
  assert.equal(isWriteMode(getScene(route, "diagnosis")), false);
});
