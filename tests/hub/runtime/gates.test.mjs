import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLedger, createWriteCycle } from "../../../skills/second-brain-hub/scripts/hub-runtime/state.mjs";
import { loadContracts, getScene } from "../../../skills/second-brain-hub/scripts/hub-runtime/contracts.mjs";
import { evaluatePreflight, checkWriteGate, validateCompletion, isInsideRoot, realPathInsideRoot }
  from "../../../skills/second-brain-hub/scripts/hub-runtime/gates.mjs";
import { SKILL_ROOT } from "./helpers.mjs";

const { route } = loadContracts(SKILL_ROOT);
const NOW = new Date("2026-08-23T00:00:00Z");

// realPathInsideRoot 现在要求存储根真实存在（失败关闭），单测使用真实临时根。
function realRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hub-gates-"));
}

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
  const storagePath = realRoot();
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

test("存储根不存在时真实路径校验失败关闭", () => {
  const res = realPathInsideRoot(path.join(os.tmpdir(), "hub-gates-missing-root"), path.join(os.tmpdir(), "hub-gates-missing-root", "a.md"));
  assert.equal(res.pass, false);
  assert.match(res.reason, /storage root does not exist/);
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

test("checkWriteGate：无 preflight / 令牌错误 / 快照不符 / 被阻塞均拒绝", () => {
  const storagePath = realRoot();
  const ledger = writeLedger(storagePath);
  assert.equal(checkWriteGate(ledger).allowed, false);           // 未 preflight（无周期）
  assert.match(checkWriteGate(ledger).reason, /preflight not completed/);
  const scene = getScene(route, "inspiration");
  const res = evaluatePreflight(ledger, scene, {
    targetPath: path.join(storagePath, "a.md"), templateContent: VALID_TEMPLATE, auth: true,
  });
  // 授权必须落在 pending 周期上，不再依赖全局 preflight 布尔值
  const cycle = createWriteCycle({
    id: "cyc-1", operation: "create", targetPath: path.join(storagePath, "a.md"),
    writeToken: res.write_token, now: NOW,
  });
  ledger.write_cycles = [cycle];
  assert.equal(checkWriteGate(ledger, { token: "bad" }).allowed, false);   // 令牌错
  assert.equal(checkWriteGate(ledger, { token: res.write_token }).allowed, true);
  // 快照不符：create 令牌用于 move、目标路径与快照不一致
  assert.match(checkWriteGate(ledger, { token: res.write_token, operation: "move" }).reason, /operation not authorized/);
  assert.equal(checkWriteGate(ledger, {
    token: res.write_token, targetPath: path.join(storagePath, "other.md"),
  }).allowed, false);
  ledger.blocked_reason = "tool unavailable";
  assert.equal(checkWriteGate(ledger, { token: res.write_token }).allowed, false); // 阻塞
});

test("完成验证：未结算的 pending 周期阻止完成", () => {
  const storagePath = realRoot();
  const scene = getScene(route, "inspiration");
  const ledger = writeLedger(storagePath);
  ledger.steps.completed = [...scene.required_steps];
  ledger.steps.outputs = { target_path: path.join(storagePath, "a.md"), final_markdown: "x" };
  ledger.preflight.write_allowed = true;
  ledger.commit = { committed: true, receipt: { ok: true } }; // 沿用旧提交态不得放行
  ledger.write_cycles = [createWriteCycle({
    id: "cyc-pending", operation: "create", targetPath: path.join(storagePath, "a.md"),
    writeToken: "t", state: "pending", now: NOW,
  })];
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, false);
  assert.ok(v.missing.some((m) => m.includes("pending write cycle not settled")), JSON.stringify(v.missing));
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
  // 有已结算周期、回执字段齐全且能在 writes 中找到记录才允许完成
  const settled = createWriteCycle({
    id: "cyc-settled", operation: "create", targetPath: "/vault/a.md",
    writeToken: "t", state: "committed", now: NOW,
  });
  settled.receipt = {
    ok: true, tool: "hub-runtime", runtime_write_id: "w-1", write_cycle: settled.id,
    operation: "create", target_path: "/vault/a.md", source_path: null,
    preview_hash: null, snapshot_hash: null, source_sha256: null,
  };
  ledger.write_cycles = [settled];
  ledger.writes = [{ id: "w-1", operation: "create", target_path: "/vault/a.md" }];
  assert.equal(validateCompletion(ledger, scene).ok, true, JSON.stringify(validateCompletion(ledger, scene).missing));
});

test("完成验证：回执与周期快照不一致时拒绝", () => {
  const scene = getScene(route, "create");
  const ledger = createLedger({ runId: "run-r", storageMode: "markdown", storagePath: "/vault", now: NOW });
  ledger.scene = "create";
  ledger.steps.required_chain = [...scene.required_steps];
  ledger.steps.completed = [...scene.required_steps];
  ledger.steps.skipped["diverge-converge"] = "未检测到发散信号";
  ledger.steps.skipped["progressive-summarization(L2)"] = "素材均已 ≥L2";
  ledger.commit = { committed: true, receipt: { ok: true } };
  ledger.preflight.write_allowed = true;
  ledger.steps.outputs = {
    usable_packets: "p", outline_or_next_artifact: "o", hemingway_bridge: "b", target_path: "/vault/a.md",
  };
  const cycle = createWriteCycle({
    id: "cyc-mismatch", operation: "create", targetPath: "/vault/a.md",
    writeToken: "t", state: "committed", now: NOW,
  });
  cycle.receipt = {
    ok: true, tool: "hub-runtime", runtime_write_id: "w-2", write_cycle: cycle.id,
    operation: "move", target_path: "/vault/other.md", source_path: null,
    preview_hash: null, snapshot_hash: null, source_sha256: null,
  };
  ledger.write_cycles = [cycle];
  ledger.writes = [{ id: "w-2", operation: "move", target_path: "/vault/other.md" }];
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, false);
  assert.ok(v.missing.some((m) => m.includes("receipt.operation mismatch")), JSON.stringify(v.missing));
});

test("完成验证：全部已结算周期都要校验，早期周期回执损坏也拒绝", () => {
  const scene = getScene(route, "create");
  const ledger = createLedger({ runId: "run-all", storageMode: "markdown", storagePath: "/vault", now: NOW });
  ledger.scene = "create";
  ledger.steps.required_chain = [...scene.required_steps];
  ledger.steps.completed = [...scene.required_steps];
  ledger.steps.skipped["diverge-converge"] = "未检测到发散信号";
  ledger.steps.skipped["progressive-summarization(L2)"] = "素材均已 ≥L2";
  ledger.commit = { committed: true, receipt: { ok: true } };
  ledger.preflight.write_allowed = true;
  ledger.steps.outputs = {
    usable_packets: "p", outline_or_next_artifact: "o", hemingway_bridge: "b", target_path: "/vault/a.md",
  };
  const good = (id, rid) => {
    const c = createWriteCycle({ id, operation: "create", targetPath: "/vault/a.md", writeToken: "t", state: "committed", now: NOW });
    c.receipt = {
      ok: true, tool: "hub-runtime", runtime_write_id: rid, write_cycle: id,
      operation: "create", target_path: "/vault/a.md", source_path: null,
      preview_hash: null, snapshot_hash: null, source_sha256: null,
    };
    return c;
  };
  const first = good("cyc-first", "w-first");
  // 第一个周期回执被破坏：回执缺失 tool 字段
  delete first.receipt.tool;
  const second = good("cyc-second", "w-second");
  ledger.write_cycles = [first, second];
  ledger.writes = [{ id: "w-first" }, { id: "w-second" }];
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, false);
  assert.ok(v.missing.some((m) => m.includes("cyc-first")), JSON.stringify(v.missing));
});

test("完成验证：rejected 周期只作审计，不阻止此前已结算周期完成", () => {
  const scene = getScene(route, "create");
  const ledger = createLedger({ runId: "run-rej", storageMode: "markdown", storagePath: "/vault", now: NOW });
  ledger.scene = "create";
  ledger.steps.required_chain = [...scene.required_steps];
  ledger.steps.completed = [...scene.required_steps];
  ledger.steps.skipped["diverge-converge"] = "未检测到发散信号";
  ledger.steps.skipped["progressive-summarization(L2)"] = "素材均已 ≥L2";
  ledger.commit = { committed: true, receipt: { ok: true } };
  ledger.preflight.write_allowed = true;
  ledger.steps.outputs = {
    usable_packets: "p", outline_or_next_artifact: "o", hemingway_bridge: "b", target_path: "/vault/a.md",
  };
  const committedCycle = createWriteCycle({
    id: "cyc-ok", operation: "create", targetPath: "/vault/a.md",
    writeToken: "t", state: "committed", now: NOW,
  });
  committedCycle.receipt = {
    ok: true, tool: "hub-runtime", runtime_write_id: "w-ok", write_cycle: "cyc-ok",
    operation: "create", target_path: "/vault/a.md", source_path: null,
    preview_hash: null, snapshot_hash: null, source_sha256: null,
  };
  const rejectedCycle = createWriteCycle({
    id: "cyc-rejected", operation: "delete", targetPath: "/vault/b.md",
    state: "rejected", now: NOW,
  });
  ledger.write_cycles = [committedCycle, rejectedCycle];
  ledger.writes = [{ id: "w-ok", operation: "create", target_path: "/vault/a.md" }];
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, true, JSON.stringify(v.missing));
});

test("完成验证：awaiting_confirmation 周期阻止完成", () => {
  const scene = getScene(route, "create");
  const ledger = createLedger({ runId: "run-aw", storageMode: "markdown", storagePath: "/vault", now: NOW });
  ledger.scene = "create";
  ledger.steps.required_chain = [...scene.required_steps];
  ledger.steps.completed = [...scene.required_steps];
  ledger.steps.skipped["diverge-converge"] = "未检测到发散信号";
  ledger.steps.skipped["progressive-summarization(L2)"] = "素材均已 ≥L2";
  ledger.commit = { committed: true, receipt: { ok: true } };
  ledger.preflight.write_allowed = true;
  ledger.steps.outputs = {
    usable_packets: "p", outline_or_next_artifact: "o", hemingway_bridge: "b", target_path: "/vault/a.md",
  };
  const committedCycle = createWriteCycle({
    id: "cyc-ok", operation: "create", targetPath: "/vault/a.md",
    writeToken: "t", state: "committed", now: NOW,
  });
  committedCycle.receipt = {
    ok: true, tool: "hub-runtime", runtime_write_id: "w-ok", write_cycle: "cyc-ok",
    operation: "create", target_path: "/vault/a.md", source_path: null,
    preview_hash: null, snapshot_hash: null, source_sha256: null,
  };
  const awaiting = createWriteCycle({
    id: "cyc-awaiting", operation: "delete", targetPath: "/vault/b.md",
    state: "awaiting_confirmation", now: NOW,
  });
  ledger.write_cycles = [committedCycle, awaiting];
  ledger.writes = [{ id: "w-ok", operation: "create", target_path: "/vault/a.md" }];
  const v = validateCompletion(ledger, scene);
  assert.equal(v.ok, false);
  assert.ok(v.missing.some((m) => m.includes("awaiting user confirmation")), JSON.stringify(v.missing));
});
