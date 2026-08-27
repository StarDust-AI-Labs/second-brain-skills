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

test("黄金路径：灵感速记 start→route→step→preflight→write→finish", () => {
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

  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--template-file", tpl, "--confirm"]);
  assert.equal(pre.code, 0);
  assert.equal(pre.json.write_allowed, true);
  assert.match(pre.json.card, /write_allowed=true/);

  // 无令牌的写入检查必须被拒绝（模拟绕过流程直接写）
  const gateDenied = run(["gate", "--state-dir", dir, "--run-id", runId, "--target-path", target]);
  assert.equal(gateDenied.code, 1);
  assert.equal(gateDenied.json.allowed, false);

  // 写入由 Runtime 实际执行，回执含一次性 runtime_write_id 与前后哈希
  const write = run(["write", "--state-dir", dir, "--run-id", runId, "--token", pre.json.write_token,
    "--operation", "create", "--target-path", target, "--content-file", tpl]);
  assert.equal(write.code, 0);
  assert.equal(write.json.receipt.tool, "hub-runtime");
  assert.ok(write.json.receipt.runtime_write_id);
  assert.equal(fs.readFileSync(target, "utf8"), TEMPLATE);
  assert.equal(write.json.state, "WRITE_COMMITTED");

  const fin = run(["finish", "--state-dir", dir, "--run-id", runId, "--result", "已保存灵感笔记"]);
  assert.equal(fin.code, 0);
  assert.match(fin.json.card, /已完成 4\/4/);
  assert.match(fin.json.card, /【位置】/);

  // 审计：台账持久化在运行目录，事件、跳过证据、写入记录可追溯
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, "hub-runs", `${runId}.json`), "utf8"));
  assert.equal(ledger.state, "COMPLETION_CARD_EMITTED");
  assert.ok(ledger.steps.skipped["capture-criteria"]);
  assert.ok(ledger.events.length >= 10);
  assert.equal(ledger.writes.length, 1);
  assert.ok(ledger.writes[0].before_sha256 === null);
  assert.ok(ledger.writes[0].after_sha256);
});

test("失败关闭：跳过 preflight 直接 write / gate 一律拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  const target = path.join(storagePath, "a.md");
  const write = run(["write", "--state-dir", dir, "--run-id", runId, "--token", "forged",
    "--target-path", target, "--operation", "create", "--content", TEMPLATE]);
  assert.equal(write.code, 1);
  assert.match(write.json.reason, /preflight not completed/);
  assert.equal(fs.existsSync(target), false); // 文件绝不能落盘
  const gate = run(["gate", "--state-dir", dir, "--run-id", runId]);
  assert.equal(gate.code, 1);
  assert.equal(gate.json.allowed, false);
});

test("失败关闭：错误令牌被拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  const { target, tpl } = inspirationSteps(dir, runId, storagePath);
  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--template-file", tpl, "--confirm"]);
  assert.equal(pre.code, 0);
  const write = run(["write", "--state-dir", dir, "--run-id", runId, "--token", "wrong-token",
    "--operation", "create", "--target-path", target, "--content-file", tpl]);
  assert.equal(write.code, 1);
  assert.match(write.json.reason, /invalid write token/);
  assert.equal(fs.existsSync(target), false);
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
  assert.match(writeStep.reason ?? writeStep.json.reason, /settled by runtime write/);
});

test("失败关闭：步骤未结算时 preflight 拒绝；完成前验证拒绝伪造完成", () => {
  const { dir, storagePath } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing", "--evidence", "ok",
    "--output", `target_path=${path.join(dir, "vault", "a.md")}`]);
  // capture-criteria 尚未结算：全序校验使 obsidian-markdown 无法越序执行，preflight 拒绝
  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", path.join(dir, "vault", "a.md"), "--confirm"]);
  assert.equal(pre.code, 1);
  assert.match(pre.json.reason, /required step not completed before preflight|conditional step unsettled/);
  // 伪造完成：没有 runtime 写入不允许 finish
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

test("运行时编辑结算后，提炼场景可以完成结算", () => {
  const { dir, storagePath } = makeStateDir();
  const start = run(["start", "--state-dir", dir]);
  const runId = start.json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "distill", "--user-text", "提炼这篇笔记"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-cli/search", "--evidence", "found", "--output", "selected_note=source.md"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-cli/read", "--evidence", "read"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "progressive-summarization", "--evidence", "distilled", "--output", "distill_level=2"]);
  const target = path.join(storagePath, "source.md");
  fs.writeFileSync(target, "---\nsource: s\ncaptured: 2026-08-01 09:00\nstatus: inbox\ntags: []\ndistill_level: 1\n---\n\n# Source\n\n原文", "utf8");
  const updated = "---\nsource: s\ncaptured: 2026-08-01 09:00\nstatus: distilled\ntags: [x]\ndistill_level: 2\n---\n\n# Source\n\n加粗重点";
  const preflight = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--confirm"]);
  assert.equal(preflight.code, 0);
  const write = run(["write", "--state-dir", dir, "--run-id", runId, "--token", preflight.json.write_token,
    "--operation", "edit", "--target-path", target, "--content", updated, "--output", "updated_markdown=distilled v2"]);
  assert.equal(write.code, 0);
  assert.equal(fs.readFileSync(target, "utf8"), updated);
  assert.equal(run(["finish", "--state-dir", dir, "--run-id", runId]).code, 0);
});

test("写入路径自动登记 target_path 输出，write→finish 无需手动登记", () => {
  const { dir, storagePath } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  // 注意：不通过 step --output 登记 target_path，依赖 write 自动登记
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing", "--evidence", "ok"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "capture-criteria", "--skip", "--reason", "r"]);
  const tpl = path.join(dir, "tpl.md");
  fs.writeFileSync(tpl, TEMPLATE, "utf8");
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-markdown", "--evidence", "ok", "--output", "final_markdown=rendered"]);
  const target = path.join(storagePath, "auto.md");
  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--template-file", tpl]);
  assert.equal(pre.code, 0);
  const write = run(["write", "--state-dir", dir, "--run-id", runId, "--token", pre.json.write_token,
    "--operation", "create", "--target-path", target, "--content-file", tpl]);
  assert.equal(write.code, 0);
  const fin = run(["finish", "--state-dir", dir, "--run-id", runId]);
  assert.equal(fin.code, 0, JSON.stringify(fin.json.missing));
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, "hub-runs", `${runId}.json`), "utf8"));
  assert.equal(ledger.steps.outputs.target_path, target);
});

test("同一 run 内多轮 preflight→write 完成多文件写入", () => {
  const { dir, storagePath } = makeStateDir();
  const runId = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  const { target, tpl } = inspirationSteps(dir, runId, storagePath);
  const target2 = path.join(storagePath, "second.md");

  const pre1 = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target, "--template-file", tpl]);
  assert.equal(pre1.code, 0);
  const write1 = run(["write", "--state-dir", dir, "--run-id", runId, "--token", pre1.json.write_token,
    "--operation", "create", "--target-path", target, "--content-file", tpl]);
  assert.equal(write1.code, 0);
  assert.equal(write1.json.state, "WRITE_COMMITTED");

  // 第二轮：WRITE_COMMITTED → PREFLIGHTED → write
  const pre2 = run(["preflight", "--state-dir", dir, "--run-id", runId, "--target-path", target2, "--template-file", tpl]);
  assert.equal(pre2.code, 0);
  assert.equal(pre2.json.write_token !== pre1.json.write_token, true);
  const write2 = run(["write", "--state-dir", dir, "--run-id", runId, "--token", pre2.json.write_token,
    "--operation", "create", "--target-path", target2, "--content-file", tpl]);
  assert.equal(write2.code, 0);

  assert.equal(fs.existsSync(target), true);
  assert.equal(fs.existsSync(target2), true);
  const fin = run(["finish", "--state-dir", dir, "--run-id", runId]);
  assert.equal(fin.code, 0);
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, "hub-runs", `${runId}.json`), "utf8"));
  assert.equal(ledger.writes.length, 2);
  assert.ok(ledger.writes.every((w) => w.runtime_write_id || w.id));
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
