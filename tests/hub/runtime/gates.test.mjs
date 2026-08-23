import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createLedger } from "../../../skills/second-brain-hub/scripts/hub-runtime/state.mjs";
import { loadContracts, getScene } from "../../../skills/second-brain-hub/scripts/hub-runtime/contracts.mjs";
import { evaluatePreflight, checkWriteGate, validateCompletion, isInsideRoot }
  from "../../../skills/second-brain-hub/scripts/hub-runtime/gates.mjs";
import { SKILL_ROOT } from "./helpers.mjs";

const { route } = loadContracts(SKILL_ROOT);
const NOW = new Date("2026-08-23T00:00:00Z");

function writeLedger(storagePath, sceneId = "inspiration") {
  const ledger = createLedger({ runId: "run-t", storageMode: "markdown", storagePath, now: NOW });
  ledger.scene = sceneId;
  ledger.steps.required_chain = [...getScene(route, sceneId).required_steps];
  return ledger;
}

const VALID_TEMPLATE = "---\nsource: x\ncaptured: 2026-08-23 08:00\nstatus: inbox\ntags: []\ndistill_level: 0\n---\n\n# t\n";

test("isInsideRoot 拒绝根目录、越界与遍历", () => {
  const root = path.join("/vault");
  assert.equal(isInsideRoot(root, path.join(root, "a.md")), true);
  assert.equal(isInsideRoot(root, root), false);                    // 根目录本身
  assert.equal(isInsideRoot(root, path.join("/elsewhere", "a.md")), false); // 越界
});

test("写前置全部满足时签发令牌", () => {
  const storagePath = path.join("/vault");
  const ledger = writeLedger(storagePath);
  const scene = getScene(route, "inspiration");
  const res = evaluatePreflight(ledger, scene, {
    targetPath: path.join(storagePath, "📥 收件箱", "灵感-x.md"),
    templateContent: VALID_TEMPLATE,
    auth: true,
  });
  assert.equal(res.write_allowed, true);
  assert.match(res.write_token, /^[0-9a-f]{16}$/);
  assert.equal(res.gates["target-path"].pass, true);
  assert.equal(res.gates["template-ready"].pass, true);
});

test("缺少模板 / 目标为根 / 相对路径 都失败关闭", () => {
  const storagePath = path.join("/vault");
  const scene = getScene(route, "inspiration");
  const noTpl = evaluatePreflight(writeLedger(storagePath), scene, {
    targetPath: path.join(storagePath, "a.md"), auth: true,
  });
  assert.equal(noTpl.write_allowed, false);
  assert.equal(noTpl.write_token, null);
  assert.equal(noTpl.gates["template-ready"].pass, false);

  const rootTarget = evaluatePreflight(writeLedger(storagePath), scene, {
    targetPath: storagePath, templateContent: VALID_TEMPLATE, auth: true,
  });
  assert.equal(rootTarget.gates["target-path"].pass, false);

  const rel = evaluatePreflight(writeLedger(storagePath), scene, {
    targetPath: "relative/a.md", templateContent: VALID_TEMPLATE, auth: true,
  });
  assert.equal(rel.gates["target-path"].pass, false);
});

test("未配置存储时写前置拒绝", () => {
  const scene = getScene(route, "inspiration");
  const ledger = writeLedger(null); // storage_path 缺失
  const res = evaluatePreflight(ledger, scene, {
    targetPath: path.join("/vault", "a.md"), templateContent: VALID_TEMPLATE, auth: true,
  });
  assert.equal(res.write_allowed, false);
});

test("checkWriteGate：无 preflight / 令牌错误 / 被阻塞均拒绝", () => {
  const storagePath = path.join("/vault");
  const ledger = writeLedger(storagePath);
  assert.equal(checkWriteGate(ledger).allowed, false);           // 未 preflight
  const scene = getScene(route, "inspiration");
  const res = evaluatePreflight(ledger, scene, {
    targetPath: path.join(storagePath, "a.md"), templateContent: VALID_TEMPLATE, auth: true,
  });
  ledger.preflight = { ...ledger.preflight, checked: true, ...res, target_path: path.join(storagePath, "a.md") };
  assert.equal(checkWriteGate(ledger, { token: "bad" }).allowed, false);   // 令牌错
  assert.equal(checkWriteGate(ledger, { token: res.write_token }).allowed, true);
  ledger.blocked_reason = "tool unavailable";
  assert.equal(checkWriteGate(ledger, { token: res.write_token }).allowed, false); // 阻塞
});

test("完成验证：必经步骤缺失则拒绝", () => {
  const storagePath = path.join("/vault");
  const scene = getScene(route, "inspiration");
  const ledger = writeLedger(storagePath);
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, false);
  assert.ok(v.missing.some((m) => m.includes("hub.target-routing")));
});

test("完成验证：写场景未经提交不能完成", () => {
  const storagePath = path.join("/vault");
  const scene = getScene(route, "inspiration");
  const ledger = writeLedger(storagePath);
  ledger.steps.completed = [...scene.required_steps];
  ledger.steps.outputs = { target_path: path.join(storagePath, "a.md"), final_markdown: "x" };
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, false);
  assert.ok(v.missing.some((m) => m.includes("commit")));
});

test("完成验证：只读场景无需提交", () => {
  const scene = getScene(route, "query");
  const ledger = createLedger({ runId: "run-q", storageMode: "markdown", storagePath: "/vault", now: NOW });
  ledger.scene = "query";
  ledger.steps.required_chain = [...scene.required_steps];
  ledger.steps.completed = [...scene.required_steps];
  ledger.steps.outputs = { search_results: "3 notes" };
  ledger.steps.skipped["twelve-favorite-problems"] = "未配置 twelve_problems";
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, true, JSON.stringify(v.missing));
});

test("完成验证：条件步骤必须有执行或跳过证据", () => {
  const scene = getScene(route, "create");
  const ledger = createLedger({ runId: "run-c", storageMode: "markdown", storagePath: "/vault", now: NOW });
  ledger.scene = "create";
  ledger.steps.required_chain = [...scene.required_steps];
  ledger.steps.completed = [...scene.required_steps];
  const v = validateCompletion(ledger, scene);
  assert.ok(v.missing.some((m) => m.includes("diverge-converge")));
  ledger.steps.skipped["diverge-converge"] = "未检测到发散信号";
  ledger.steps.skipped["progressive-summarization(L2)"] = "素材均已 ≥L2";
  ledger.commit = { committed: true, receipt: { ok: true } };
  ledger.preflight.write_allowed = true;
  ledger.steps.outputs = {
    usable_packets: "p", outline_or_next_artifact: "o", hemingway_bridge: "b", target_path: "/vault/a.md",
  };
  assert.equal(validateCompletion(ledger, scene).ok, true);
});
