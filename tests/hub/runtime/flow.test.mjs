import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { makeStateDir, REPO_ROOT } from "./helpers.mjs";

const CLI = path.join(REPO_ROOT, "skills", "second-brain-hub", "scripts", "hub-runtime.mjs");

function run(args) {
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  let json = null;
  try { json = JSON.parse(res.stdout); } catch { /* 保留原始输出用于断言失败排查 */ }
  return { code: res.status, json, stdout: res.stdout, stderr: res.stderr };
}

const TEMPLATE = "---\nsource: 用户原话\ncaptured: 2026-08-23 09:00\nstatus: inbox\ntags: []\ndistill_level: 0\n---\n\n# 灵感-分镜素材包\n";

function inspirationSteps(dir, runId, storagePath) {
  const target = path.join(storagePath, "📥 收件箱", "灵感-分镜素材包_2026-08-23-0900.md");
  const s1 = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing",
    "--evidence", "归属：📥 收件箱", "--output", `target_path=${target}`]);
  const s2 = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "capture-criteria",
    "--skip", "--reason", "灵感自带个人价值，用户未表达保留犹豫"]);
  const tpl = path.join(dir, "final.md");
  fs.writeFileSync(tpl, TEMPLATE, "utf8");
  const s3 = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-markdown",
    "--evidence", "模板已渲染", "--output", "final_markdown=rendered"]);
  return { target, tpl, codes: [s1.code, s2.code, s3.code] };
}

test("黄金路径：灵感速记 start→route→step→preflight→commit→finish", () => {
  const { dir, storagePath } = makeStateDir();
  const start = run(["start", "--state-dir", dir]);
  assert.equal(start.code, 0);
  const runId = start.json.run_id;

  const route = run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration",
    "--user-text", "记一下：AI 视频分镜应先做镜头级素材包"]);
  assert.equal(route.code, 0);
  assert.match(route.json.card, /【灵感速记】步骤 1\/4/);
  assert.match(route.json.card, /run: /);

  const { target, tpl, codes } = inspirationSteps(dir, runId, storagePath);
  assert.deepEqual(codes, [0, 0, 0]);

  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--template-file", tpl, "--auth"]);
  assert.equal(pre.code, 0);
  assert.equal(pre.json.write_allowed, true);
  assert.match(pre.json.card, /write_allowed=true/);

  // 无令牌的写入检查必须被拒绝（模拟绕过流程直接写）
  const gateDenied = run(["gate", "--state-dir", dir, "--run-id", runId, "--target-path", target]);
  assert.equal(gateDenied.code, 1);
  assert.equal(gateDenied.json.allowed, false);

  // 真实写入发生后才允许 commit（回执目标必须真实存在）
  const earlyCommit = run(["commit", "--state-dir", dir, "--run-id", runId, "--token", pre.json.write_token,
    "--target-path", target, "--receipt", JSON.stringify({ tool: "obsidian-cli", operation: "create" })]);
  assert.equal(earlyCommit.code, 1);
  assert.match(earlyCommit.json.reason, /receipt target missing/);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, TEMPLATE, "utf8");
  const commit = run(["commit", "--state-dir", dir, "--run-id", runId, "--token", pre.json.write_token,
    "--target-path", target, "--receipt", JSON.stringify({ tool: "obsidian-cli", operation: "create" })]);
  assert.equal(commit.code, 0);
  assert.equal(commit.json.state, "WRITE_COMMITTED");

  const fin = run(["finish", "--state-dir", dir, "--run-id", runId, "--result", "已保存灵感笔记"]);
  assert.equal(fin.code, 0);
  assert.match(fin.json.card, /已完成 4\/4/);
  assert.match(fin.json.card, /【位置】/);

  // 审计：台账持久化在运行目录，事件、跳过证据可追溯
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, "hub-runs", `${runId}.json`), "utf8"));
  assert.equal(ledger.state, "COMPLETION_CARD_EMITTED");
  assert.ok(ledger.steps.skipped["capture-criteria"]);
  assert.ok(ledger.events.length >= 10);
});

test("失败关闭：跳过 preflight 直接 commit / gate 一律拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  const target = path.join(storagePath, "a.md");
  fs.writeFileSync(target, TEMPLATE, "utf8");
  const commit = run(["commit", "--state-dir", dir, "--run-id", runId, "--token", "forged",
    "--target-path", target, "--receipt", JSON.stringify({ ok: true, operation: "create" })]);
  assert.equal(commit.code, 1);
  assert.match(commit.json.reason, /preflight not completed/);
  const gate = run(["gate", "--state-dir", dir, "--run-id", runId]);
  assert.equal(gate.code, 1);
  assert.equal(gate.json.allowed, false);
});

test("失败关闭：错误令牌被拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  const { target, tpl } = inspirationSteps(dir, runId, storagePath);
  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--template-file", tpl, "--auth"]);
  assert.equal(pre.code, 0);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, TEMPLATE, "utf8");
  const commit = run(["commit", "--state-dir", dir, "--run-id", runId, "--token", "wrong-token",
    "--target-path", target, "--receipt", JSON.stringify({ operation: "create" })]);
  assert.equal(commit.code, 1);
  assert.match(commit.json.reason, /invalid write token/);
});

test("失败关闭：越序步骤与跳过必选步骤被拒绝", () => {
  const { dir } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  const ooo = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-markdown", "--evidence", "x"]);
  assert.equal(ooo.code, 1);
  assert.match(ooo.json.reason, /out-of-order/);
  const skipRequired = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing", "--skip", "--reason", "想跳过"]);
  assert.equal(skipRequired.code, 1);
  assert.match(skipRequired.json.reason, /cannot be skipped/);
  const writeViaStep = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing", "--evidence", "ok"]);
  assert.equal(writeViaStep.code, 0);
  const writeStep = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-cli/create", "--evidence", "直接写"]);
  assert.equal(writeStep.code, 1);
  assert.match(writeStep.json.reason, /settled by commit/);
});

test("失败关闭：条件未结算时 preflight 拒绝；完成前验证拒绝伪造完成", () => {
  const { dir } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing", "--evidence", "ok",
    "--output", `target_path=${path.join(dir, "vault", "a.md")}`]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-markdown", "--evidence", "ok"]);
  // capture-criteria 尚未结算
  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", path.join(dir, "vault", "a.md"), "--auth"]);
  assert.equal(pre.code, 1);
  assert.match(pre.json.reason, /conditional step unsettled/);
  // 伪造完成：没有 commit 不允许 finish
  const fin = run(["finish", "--state-dir", dir, "--run-id", runId]);
  assert.equal(fin.code, 1);
  assert.ok(fin.json.missing.length > 0);
});

test("配置缺失：Vault 场景被阻塞，阻塞后拒绝继续", () => {
  const { dir } = makeStateDir();
  fs.rmSync(path.join(dir, "hub-state.json")); // 模拟未初始化
  const start = run(["start", "--state-dir", dir]);
  assert.equal(start.code, 0);
  assert.equal(start.json.config_ok, false);
  const runId = start.json.run_id;
  const route = run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  assert.equal(route.code, 2);
  assert.equal(route.json.blocked, true);
  const step = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing", "--evidence", "x"]);
  assert.equal(step.code, 1);
  assert.match(step.json.reason, /blocked/);
});

test("只读场景：探索查询无需写入前置即可完成", () => {
  const { dir } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  const route = run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "query", "--user-text", "找一下 AI 视频笔记"]);
  assert.equal(route.code, 0);
  const s = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-cli/search",
    "--evidence", "命中 3 条", "--output", "search_results=3 notes"]);
  assert.equal(s.code, 0);
  const sk = run(["step", "--state-dir", dir, "--run-id", runId, "--step", "twelve-favorite-problems",
    "--skip", "--reason", "未配置 twelve_problems"]);
  assert.equal(sk.code, 0);
  const fin = run(["finish", "--state-dir", dir, "--run-id", runId, "--result", "找到 3 条笔记"]);
  assert.equal(fin.code, 0);
  assert.match(fin.json.card, /已完成 2\/2/);
  assert.equal(fin.json.card.includes("【位置】"), false);
});

test("写入提交登记输出后，提炼场景可以完成结算", () => {
  const { dir, storagePath } = makeStateDir();
  const start = run(["start", "--state-dir", dir]);
  const runId = start.json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "distill", "--user-text", "提炼这篇笔记"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-cli/search", "--evidence", "found", "--output", "selected_note=source.md"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-cli/read", "--evidence", "read"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "progressive-summarization", "--evidence", "distilled", "--output", "distill_level=2"]);
  const target = path.join(storagePath, "source.md");
  fs.writeFileSync(target, "updated\n", "utf8");
  const preflight = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--auth"]);
  assert.equal(preflight.code, 0);
  const committed = run(["commit", "--state-dir", dir, "--run-id", runId, "--token", preflight.json.write_token,
    "--target-path", target, "--receipt", '{"operation":"edit"}', "--output", "updated_markdown=updated markdown"]);
  assert.equal(committed.code, 0);
  assert.equal(run(["finish", "--state-dir", dir, "--run-id", runId]).code, 0);
});

test("status 输出当前台账与地图卡", () => {
  const { dir } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  const st = run(["status", "--state-dir", dir, "--run-id", runId]);
  assert.equal(st.code, 0);
  assert.equal(st.json.state, "MAP_CARD_EMITTED");
  assert.match(st.json.card, /【灵感速记】/);
  assert.equal(st.json.ledger.run_id, runId);
});
