import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadContracts } from "../../../skills/second-brain-hub/scripts/hub-runtime/contracts.mjs";
import { makeStateDir, REPO_ROOT, SKILL_ROOT } from "./helpers.mjs";

const CLI = path.join(REPO_ROOT, "skills", "second-brain-hub", "scripts", "hub-runtime.mjs");
const TEMPLATE = "---\nsource: x\ncaptured: 2026-08-28 09:00\nstatus: inbox\ntags: []\ndistill_level: 0\n---\n\n# 周期校验\n";
function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  return { code: r.status, json: JSON.parse(r.stdout) };
}
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function ledgerOf(dir, runId) {
  return JSON.parse(fs.readFileSync(path.join(dir, "hub-runs", `${runId}.json`), "utf8"));
}
function writeLedger(dir, runId, ledger) {
  fs.writeFileSync(path.join(dir, "hub-runs", `${runId}.json`), `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

// inspiration 场景：完成三个前置步骤，供 create 黄金路径使用
function inspirationReady(dir, runId) {
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inspiration", "--user-text", "x"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "hub.target-routing", "--evidence", "ok"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "capture-criteria", "--skip", "--reason", "personal"]);
  run(["step", "--state-dir", dir, "--run-id", runId, "--step", "obsidian-markdown", "--evidence", "ok", "--output", "final_markdown=rendered"]);
}

function inboxReady(dir, runId) {
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inbox", "--user-text", "整理"]);
  const inbox = loadContracts(SKILL_ROOT).route.scenes.find((s) => s.id === "inbox");
  const writeStep = inbox.step_order[inbox.step_order.length - 1];
  for (const s of inbox.step_order) {
    if (s === writeStep) continue;
    const isConditional = (inbox.conditional_steps || []).some((c) => c.id === s);
    const extra = s === "obsidian-cli/list" ? ["--output", "inbox_preview=清单"] : [];
    run(isConditional
      ? ["step", "--state-dir", dir, "--run-id", runId, "--step", s, "--skip", "--reason", "n/a", ...extra]
      : ["step", "--state-dir", dir, "--run-id", runId, "--step", s, "--evidence", "ok", ...extra]);
  }
  return inbox;
}

// 危险操作两阶段：preflight → confirm，返回 write 所需凭证
function twoPhase(dir, runId, operation, target, source = target) {
  const pre = run(["preflight", "--state-dir", dir, "--run-id", runId, "--operation", operation,
    "--target-path", target, "--source-path", source]);
  if (pre.code !== 0) return { pre, conf: null };
  const conf = run(["confirm", "--state-dir", dir, "--run-id", runId,
    "--cycle", pre.json.write_cycle, "--challenge", pre.json.confirmation_challenge]);
  return { pre, conf };
}

test("黄金路径 create：preflight→write→finish 全链通过", () => {
  const { dir, storagePath } = makeStateDir();
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inspirationReady(dir, id);
  const tpl = path.join(dir, "tpl.md");
  fs.writeFileSync(tpl, TEMPLATE);
  const target = path.join(storagePath, "created.md");
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--template-file", tpl]);
  assert.equal(pre.code, 0, JSON.stringify(pre.json));
  const write = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token,
    "--operation", "create", "--target-path", target, "--content-file", tpl]);
  assert.equal(write.code, 0, JSON.stringify(write.json));
  assert.equal(fs.readFileSync(target, "utf8"), TEMPLATE);
  assert.equal(run(["finish", "--state-dir", dir, "--run-id", id]).code, 0);
});

test("黄金路径 edit：内容校验与回执一致后完成", () => {
  const { dir, storagePath } = makeStateDir();
  const id = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", id, "--scene", "distill", "--user-text", "提炼"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "obsidian-cli/search", "--evidence", "found", "--output", "selected_note=source.md"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "obsidian-cli/read", "--evidence", "read"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "progressive-summarization", "--evidence", "distilled", "--output", "distill_level=2"]);
  const target = path.join(storagePath, "source.md");
  fs.writeFileSync(target, TEMPLATE);
  const updated = TEMPLATE.replace("distill_level: 0", "distill_level: 2");
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "edit", "--target-path", target]);
  assert.equal(pre.code, 0, JSON.stringify(pre.json));
  const write = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token,
    "--operation", "edit", "--target-path", target, "--content", updated,
    "--output", "updated_markdown=distilled"]);
  assert.equal(write.code, 0, JSON.stringify(write.json));
  assert.equal(fs.readFileSync(target, "utf8"), updated);
  assert.equal(run(["finish", "--state-dir", dir, "--run-id", id]).code, 0);
});

test("黄金路径 move：两阶段确认后移动成功", () => {
  const { dir, storagePath } = makeStateDir();
  const src = path.join(storagePath, "src.md");
  const dst = path.join(storagePath, "dst.md");
  fs.writeFileSync(src, TEMPLATE);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxReady(dir, id);
  const { pre, conf } = twoPhase(dir, id, "move", dst, src);
  assert.equal(pre.code, 0, JSON.stringify(pre.json));
  assert.equal(conf.code, 0, JSON.stringify(conf.json));
  const write = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf.json.write_token,
    "--operation", "move", "--target-path", dst, "--source-path", src,
    "--confirmation", conf.json.confirmation_token,
    "--output", "target_path_or_delete_confirmation=moved"]);
  assert.equal(write.code, 0, JSON.stringify(write.json));
  assert.equal(fs.existsSync(src), false);
  assert.equal(fs.existsSync(dst), true);
  assert.equal(run(["finish", "--state-dir", dir, "--run-id", id]).code, 0);
});

test("黄金路径 delete：两阶段确认后删除成功", () => {
  const { dir, storagePath } = makeStateDir();
  const victim = path.join(storagePath, "victim.md");
  fs.writeFileSync(victim, TEMPLATE);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxReady(dir, id);
  const { conf } = twoPhase(dir, id, "delete", victim);
  assert.equal(conf.code, 0, JSON.stringify(conf.json));
  const write = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf.json.write_token,
    "--operation", "delete", "--target-path", victim, "--source-path", victim,
    "--confirmation", conf.json.confirmation_token,
    "--output", "target_path_or_delete_confirmation=deleted"]);
  assert.equal(write.code, 0, JSON.stringify(write.json));
  assert.equal(fs.existsSync(victim), false);
  assert.equal(run(["finish", "--state-dir", dir, "--run-id", id]).code, 0);
});

test("多轮 preflight→write→finish：两个周期都结算后完成", () => {
  const { dir, storagePath } = makeStateDir();
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inspirationReady(dir, id);
  const tpl = path.join(dir, "tpl.md");
  fs.writeFileSync(tpl, TEMPLATE);
  const first = path.join(storagePath, "first.md");
  const second = path.join(storagePath, "second.md");
  const p1 = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", first, "--template-file", tpl]);
  assert.equal(p1.code, 0);
  const w1 = run(["write", "--state-dir", dir, "--run-id", id, "--token", p1.json.write_token,
    "--operation", "create", "--target-path", first, "--content-file", tpl]);
  assert.equal(w1.code, 0, JSON.stringify(w1.json));
  const p2 = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", second, "--template-file", tpl]);
  assert.equal(p2.code, 0, JSON.stringify(p2.json));
  const denied = run(["finish", "--state-dir", dir, "--run-id", id]);
  assert.equal(denied.code, 1);
  const w2 = run(["write", "--state-dir", dir, "--run-id", id, "--token", p2.json.write_token,
    "--operation", "create", "--target-path", second, "--content-file", tpl]);
  assert.equal(w2.code, 0, JSON.stringify(w2.json));
  const fin = run(["finish", "--state-dir", dir, "--run-id", id]);
  assert.equal(fin.code, 0, JSON.stringify(fin.json.missing));
  const ledger = ledgerOf(dir, id);
  assert.deepEqual(ledger.write_cycles.map((c) => c.state), ["committed", "committed"]);
});

// 直接破坏台账中第一个已结算周期的回执，验证 finish 仍会遍历校验
function withCorruptedFirstCycle(dir, id, mutate) {
  const ledger = ledgerOf(dir, id);
  const first = ledger.write_cycles.find((c) => c.state === "committed");
  mutate(first, ledger);
  writeLedger(dir, id, ledger);
  return run(["finish", "--state-dir", dir, "--run-id", id]);
}

test("第一个 committed 周期回执损坏、第二个正常时 finish 仍拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inspirationReady(dir, id);
  const tpl = path.join(dir, "tpl.md");
  fs.writeFileSync(tpl, TEMPLATE);
  for (const name of ["one.md", "two.md"]) {
    const target = path.join(storagePath, name);
    const p = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--template-file", tpl]);
    assert.equal(p.code, 0, JSON.stringify(p.json));
    const w = run(["write", "--state-dir", dir, "--run-id", id, "--token", p.json.write_token,
      "--operation", "create", "--target-path", target, "--content-file", tpl]);
    assert.equal(w.code, 0, JSON.stringify(w.json));
  }
  const ledger = ledgerOf(dir, id);
  assert.equal(ledger.write_cycles.length, 2);
  const firstId = ledger.write_cycles[0].id;
  // 破坏第一个周期：回执 tool 字段被改
  const fin = withCorruptedFirstCycle(dir, id, (first) => { first.receipt.tool = "other-tool"; });
  assert.equal(fin.code, 1);
  assert.ok(fin.json.missing.some((m) => m.includes(firstId)), JSON.stringify(fin.json.missing));
});

test("receipt.write_cycle 不一致时 finish 拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inspirationReady(dir, id);
  const tpl = path.join(dir, "tpl.md");
  fs.writeFileSync(tpl, TEMPLATE);
  const target = path.join(storagePath, "a.md");
  const p = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--template-file", tpl]);
  const w = run(["write", "--state-dir", dir, "--run-id", id, "--token", p.json.write_token,
    "--operation", "create", "--target-path", target, "--content-file", tpl]);
  assert.equal(w.code, 0);
  const fin = withCorruptedFirstCycle(dir, id, (first) => { first.receipt.write_cycle = "cyc-other"; });
  assert.equal(fin.code, 1);
  assert.ok(fin.json.missing.some((m) => m.includes("write_cycle mismatch")), JSON.stringify(fin.json.missing));
});

test("receipt.runtime_write_id 与 writes 记录不匹配时 finish 拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inspirationReady(dir, id);
  const tpl = path.join(dir, "tpl.md");
  fs.writeFileSync(tpl, TEMPLATE);
  const target = path.join(storagePath, "a.md");
  const p = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--template-file", tpl]);
  const w = run(["write", "--state-dir", dir, "--run-id", id, "--token", p.json.write_token,
    "--operation", "create", "--target-path", target, "--content-file", tpl]);
  assert.equal(w.code, 0);
  const fin = withCorruptedFirstCycle(dir, id, (first) => { first.receipt.runtime_write_id = "w-does-not-exist"; });
  assert.equal(fin.code, 1);
  assert.ok(fin.json.missing.some((m) => m.includes("no write record")), JSON.stringify(fin.json.missing));
});

test("receipt.snapshot_hash / preview_hash 与周期不一致时 finish 拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const victim = path.join(storagePath, "victim.md");
  fs.writeFileSync(victim, TEMPLATE);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxReady(dir, id);
  const { conf } = twoPhase(dir, id, "delete", victim);
  assert.equal(conf.code, 0);
  const w = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf.json.write_token,
    "--operation", "delete", "--target-path", victim, "--source-path", victim,
    "--confirmation", conf.json.confirmation_token,
    "--output", "target_path_or_delete_confirmation=deleted"]);
  assert.equal(w.code, 0);
  // 篡改快照哈希
  const snapshotFin = withCorruptedFirstCycle(dir, id, (first) => { first.receipt.snapshot_hash = "tampered"; });
  assert.equal(snapshotFin.code, 1);
  assert.ok(snapshotFin.json.missing.some((m) => m.includes("snapshot_hash mismatch")), JSON.stringify(snapshotFin.json.missing));
  // 篡改预览哈希
  const previewFin = withCorruptedFirstCycle(dir, id, (first) => { first.receipt.preview_hash = "tampered"; });
  assert.equal(previewFin.code, 1);
  assert.ok(previewFin.json.missing.some((m) => m.includes("preview_hash mismatch")), JSON.stringify(previewFin.json.missing));
});

test("伪造 preview 不能授权删除内容不同的真实文件", () => {
  const { dir, storagePath } = makeStateDir();
  const real = path.join(storagePath, "real.md");
  const other = path.join(storagePath, "other.md");
  const realContent = TEMPLATE;
  const otherContent = `${TEMPLATE}\n完全不同的内容\n`;
  fs.writeFileSync(real, realContent);
  fs.writeFileSync(other, otherContent);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxReady(dir, id);
  // 对 real.md 走完两阶段
  const { pre, conf } = twoPhase(dir, id, "delete", real);
  assert.equal(pre.code, 0);
  const realSha = sha(Buffer.from(realContent));
  assert.equal(pre.json.source_sha256, realSha);
  // 试图用 real.md 的令牌删除 other.md（内容不同）
  const wrongTarget = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf.json.write_token,
    "--operation", "delete", "--target-path", other, "--source-path", other,
    "--confirmation", conf.json.confirmation_token]);
  assert.equal(wrongTarget.code, 1);
  assert.match(wrongTarget.json.reason, /target differs|invalid confirmation token/);
  assert.equal(fs.existsSync(other), true);
  assert.equal(fs.existsSync(real), true);
  // 只有 other.md 自己的两阶段才能删除它，且快照记录的是 other.md 的真实 SHA
  const otherPhase = twoPhase(dir, id, "delete", other);
  assert.equal(otherPhase.pre.code, 0, JSON.stringify(otherPhase.pre.json));
  assert.equal(otherPhase.pre.json.source_sha256, sha(Buffer.from(otherContent)));
  assert.notEqual(otherPhase.pre.json.source_sha256, realSha);
});

test("未经过第二阶段用户确认不能执行 move/delete", () => {
  const { dir, storagePath } = makeStateDir();
  const victim = path.join(storagePath, "victim.md");
  fs.writeFileSync(victim, TEMPLATE);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxReady(dir, id);
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", victim, "--source-path", victim]);
  assert.equal(pre.code, 0);
  // 只有 challenge 不能写
  const challengeOnly = run(["write", "--state-dir", dir, "--run-id", id,
    "--operation", "delete", "--target-path", victim, "--source-path", victim,
    "--confirmation", pre.json.confirmation_challenge]);
  assert.equal(challengeOnly.code, 1);
  // 无令牌直接写
  const noToken = run(["write", "--state-dir", dir, "--run-id", id,
    "--operation", "delete", "--target-path", victim, "--source-path", victim]);
  assert.equal(noToken.code, 1);
  assert.equal(fs.existsSync(victim), true);
  // 未确认前 finish 被拒
  const fin = run(["finish", "--state-dir", dir, "--run-id", id]);
  assert.equal(fin.code, 1);
  assert.ok(fin.json.missing.some((m) => m.includes("awaiting user confirmation")), JSON.stringify(fin.json.missing));
});
