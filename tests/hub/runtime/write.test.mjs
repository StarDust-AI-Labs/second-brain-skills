import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadContracts } from "../../../skills/second-brain-hub/scripts/hub-runtime/contracts.mjs";
import { makeStateDir, REPO_ROOT, SKILL_ROOT } from "./helpers.mjs";

const CLI = path.join(REPO_ROOT, "skills", "second-brain-hub", "scripts", "hub-runtime.mjs");
const TEMPLATE = "---\nsource: x\ncaptured: 2026-08-25 09:00\nstatus: inbox\ntags: []\ndistill_level: 0\n---\n\n# Runtime write\n";
function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  return { code: r.status, json: JSON.parse(r.stdout) };
}

test("Runtime write performs the operation and records hashes", () => {
  const { dir, storagePath } = makeStateDir();
  const target = path.join(storagePath, "runtime.md");
  const template = path.join(dir, "template.md");
  fs.writeFileSync(template, TEMPLATE);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", id, "--scene", "inspiration", "--user-text", "x"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "hub.target-routing", "--evidence", "ok"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "capture-criteria", "--skip", "--reason", "personal"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "obsidian-markdown", "--evidence", "ok", "--output", "final_markdown=rendered"]);
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--template-file", template]);
  assert.equal(pre.code, 0);
  const write = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token, "--operation", "create", "--target-path", target, "--content-file", template]);
  assert.equal(write.code, 0);
  assert.equal(write.json.receipt.tool, "hub-runtime");
  assert.equal(fs.readFileSync(target, "utf8"), TEMPLATE);
  assert.ok(write.json.receipt.runtime_write_id);
});

test("write content without frontmatter is rejected even with a valid token", () => {
  const { dir, storagePath } = makeStateDir();
  const target = path.join(storagePath, "no-frontmatter.md");
  const template = path.join(dir, "template.md");
  fs.writeFileSync(template, TEMPLATE);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", id, "--scene", "inspiration", "--user-text", "x"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "hub.target-routing", "--evidence", "ok"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "capture-criteria", "--skip", "--reason", "personal"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "obsidian-markdown", "--evidence", "ok", "--output", "final_markdown=rendered"]);
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--template-file", template]);
  assert.equal(pre.code, 0);
  // 模板与写入内容脱钩：内容缺少 frontmatter 必须被拒
  const write = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token, "--operation", "create", "--target-path", target, "--content", "garbage without frontmatter"]);
  assert.equal(write.code, 1);
  assert.match(write.json.reason, /write content rejected: frontmatter required/);
  assert.equal(fs.existsSync(target), false);
});

// 危险操作两阶段：preflight（Runtime 生成文件快照 + challenge）→ confirm（用户确认后签发令牌）
function inboxRun(dir, runId) {
  run(["route", "--state-dir", dir, "--run-id", runId, "--scene", "inbox", "--user-text", "整理收件箱"]);
  const inbox = loadContracts(SKILL_ROOT).route.scenes.find((s) => s.id === "inbox");
  const writeStep = inbox.step_order[inbox.step_order.length - 1];
  for (const s of inbox.step_order) {
    if (s === writeStep) continue;
    const isConditional = (inbox.conditional_steps || []).some((c) => c.id === s);
    // obsidian-cli/list 需要登记 inbox_preview（inbox 场景必需输出）
    const extra = s === "obsidian-cli/list" ? ["--output", "inbox_preview=收件箱清单"] : [];
    run(isConditional
      ? ["step", "--state-dir", dir, "--run-id", runId, "--step", s, "--skip", "--reason", "n/a", ...extra]
      : ["step", "--state-dir", dir, "--run-id", runId, "--step", s, "--evidence", "ok", ...extra]);
  }
}

function startInbox(fileSetup = () => {}) {
  const { dir, storagePath } = makeStateDir();
  fileSetup(storagePath);
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxRun(dir, id);
  return { dir, storagePath, id };
}

test("delete 两阶段：preflight 不签发可执行令牌，confirm 后才可写", () => {
  const { dir, storagePath, id } = startInbox((root) => fs.writeFileSync(path.join(root, "victim.md"), TEMPLATE));
  const target = path.join(storagePath, "victim.md");
  // 第一阶段：Runtime 读取真实文件生成快照，只返回 challenge
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", target, "--source-path", target]);
  assert.equal(pre.code, 0, JSON.stringify(pre.json));
  assert.equal(pre.json.operation, "delete");
  assert.equal(pre.json.cycle_state, "awaiting_confirmation");
  assert.equal(pre.json.write_token, null, "first phase must not issue a write token");
  assert.equal(pre.json.confirmation_token, null);
  assert.ok(pre.json.confirmation_challenge);
  assert.ok(pre.json.source_sha256);
  assert.ok(pre.json.snapshot_hash);
  assert.match(pre.json.preview, /sha256: /);
  assert.equal(pre.json.next, "confirm");

  // 未经第二阶段确认直接 write：无 pending 周期，必须拒绝
  const beforeConfirm = run(["write", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", target, "--source-path", target]);
  assert.equal(beforeConfirm.code, 1);
  assert.equal(fs.existsSync(target), true);

  // 错误的 challenge 不能换取令牌
  const badChallenge = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre.json.write_cycle, "--challenge", "wrong-challenge"]);
  assert.equal(badChallenge.code, 1);
  assert.match(badChallenge.json.reason, /invalid confirmation challenge/);

  // 第二阶段：正确 challenge 签发一次性令牌
  const conf = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre.json.write_cycle, "--challenge", pre.json.confirmation_challenge]);
  assert.equal(conf.code, 0, JSON.stringify(conf.json));
  const { write_token: wt, confirmation_token: token } = conf.json;
  assert.ok(wt && token);
  assert.equal(conf.json.source_sha256, pre.json.source_sha256);

  // challenge 不能重复使用
  const replayChallenge = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre.json.write_cycle, "--challenge", pre.json.confirmation_challenge]);
  assert.equal(replayChallenge.code, 1);

  // 缺令牌 / 错令牌
  const noToken = run(["write", "--state-dir", dir, "--run-id", id, "--token", wt, "--operation", "delete",
    "--target-path", target, "--source-path", target]);
  assert.equal(noToken.code, 1);
  assert.match(noToken.json.reason, /requires confirmation token/);
  const wrong = run(["write", "--state-dir", dir, "--run-id", id, "--token", wt, "--operation", "delete",
    "--target-path", target, "--source-path", target, "--confirmation", "wrong-token"]);
  assert.equal(wrong.code, 1);
  assert.match(wrong.json.reason, /invalid confirmation token/);
  assert.equal(fs.existsSync(target), true);

  // 正确令牌 → 删除成功，回执含真实源文件 SHA
  const ok = run(["write", "--state-dir", dir, "--run-id", id, "--token", wt, "--operation", "delete",
    "--target-path", target, "--source-path", target, "--confirmation", token]);
  assert.equal(ok.code, 0, JSON.stringify(ok.json));
  assert.equal(fs.existsSync(target), false);
  assert.equal(ok.json.receipt.source_sha256, pre.json.source_sha256);
  assert.equal(ok.json.receipt.snapshot_hash, pre.json.snapshot_hash);
});

test("create 令牌不得用于 move/delete/edit", () => {
  const { dir, storagePath } = makeStateDir();
  const target = path.join(storagePath, "note.md");
  const mover = path.join(storagePath, "moved.md");
  const template = path.join(dir, "template.md");
  fs.writeFileSync(template, TEMPLATE, "utf8");
  const id = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", id, "--scene", "inspiration", "--user-text", "x"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "hub.target-routing", "--evidence", "ok"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "capture-criteria", "--skip", "--reason", "personal"]);
  run(["step", "--state-dir", dir, "--run-id", id, "--step", "obsidian-markdown", "--evidence", "ok", "--output", "final_markdown=rendered"]);
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--template-file", template]);
  assert.equal(pre.code, 0);
  assert.equal(pre.json.operation, "create");

  // create 令牌用于 move
  const asMove = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token,
    "--operation", "move", "--target-path", mover, "--source-path", target]);
  assert.equal(asMove.code, 1);
  assert.match(asMove.json.reason, /operation not authorized by preflight/);

  // create 令牌用于 delete（即便带上 --confirm）
  const asDelete = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token,
    "--operation", "delete", "--target-path", target, "--source-path", target, "--confirm"]);
  assert.equal(asDelete.code, 1);
  assert.match(asDelete.json.reason, /operation not authorized by preflight/);

  // create 令牌用于 edit
  const asEdit = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token,
    "--operation", "edit", "--target-path", target, "--content", TEMPLATE]);
  assert.equal(asEdit.code, 1);
  assert.match(asEdit.json.reason, /operation not authorized by preflight/);
  assert.equal(fs.existsSync(target), false);
});

test("move 的源路径必须与 preflight 快照一致", () => {
  const { dir, storagePath } = makeStateDir();
  const approved = path.join(storagePath, "approved.md");
  const unapproved = path.join(storagePath, "unapproved.md");
  const dest = path.join(storagePath, "dest.md");
  fs.writeFileSync(approved, TEMPLATE, "utf8");
  fs.writeFileSync(unapproved, TEMPLATE, "utf8");
  const id = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", id, "--scene", "inbox", "--user-text", "移动这个"]);
  const inbox = loadContracts(SKILL_ROOT).route.scenes.find((s) => s.id === "inbox");
  const writeStep = inbox.step_order[inbox.step_order.length - 1];
  for (const s of inbox.step_order) {
    if (s === writeStep) continue;
    const isConditional = (inbox.conditional_steps || []).some((c) => c.id === s);
    run(isConditional
      ? ["step", "--state-dir", dir, "--run-id", id, "--step", s, "--skip", "--reason", "n/a"]
      : ["step", "--state-dir", dir, "--run-id", id, "--step", s, "--evidence", "ok"]);
  }
  // 仅批准 approved.md 作为源；第一阶段只返回 challenge
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "move",
    "--target-path", dest, "--source-path", approved]);
  assert.equal(pre.code, 0, JSON.stringify(pre.json));
  assert.equal(pre.json.cycle_state, "awaiting_confirmation");
  const conf = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre.json.write_cycle, "--challenge", pre.json.confirmation_challenge]);
  assert.equal(conf.code, 0, JSON.stringify(conf.json));
  const { write_token: wt, confirmation_token: token } = conf.json;

  // 未经批准的源路径必须被拒
  const bad = run(["write", "--state-dir", dir, "--run-id", id, "--token", wt,
    "--operation", "move", "--target-path", dest, "--source-path", unapproved, "--confirmation", token]);
  assert.equal(bad.code, 1);
  assert.match(bad.json.reason, /source differs from preflight-approved path/);
  assert.equal(fs.existsSync(unapproved), true);
  assert.equal(fs.existsSync(dest), false);

  // 未批准的目标路径同样被拒
  const badTarget = run(["write", "--state-dir", dir, "--run-id", id, "--token", wt,
    "--operation", "move", "--target-path", path.join(storagePath, "elsewhere.md"),
    "--source-path", approved, "--confirmation", token]);
  assert.equal(badTarget.code, 1);
  assert.match(badTarget.json.reason, /target differs from preflight-approved path/);

  // 快照一致时成功，回执带移动前真实源文件 SHA-256
  const expectedSha = crypto.createHash("sha256").update(fs.readFileSync(approved)).digest("hex");
  const ok = run(["write", "--state-dir", dir, "--run-id", id, "--token", wt,
    "--operation", "move", "--target-path", dest, "--source-path", approved, "--confirmation", token]);
  assert.equal(ok.code, 0, JSON.stringify(ok.json));
  assert.equal(fs.existsSync(approved), false);
  assert.equal(fs.existsSync(dest), true);
  assert.equal(ok.json.receipt.source_sha256, expectedSha);
  assert.equal(ok.json.receipt.operation, "move");
});

test("调用方提供的 --preview/--preview-hash 不再作为授权依据", () => {
  const { dir, storagePath } = makeStateDir();
  const victim = path.join(storagePath, "victim.md");
  fs.writeFileSync(victim, TEMPLATE, "utf8");
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxRun(dir, id);
  // 伪造的预览文本不得被接受
  const forged = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", victim, "--source-path", victim, "--preview", "这是一份与真实文件无关的预览"]);
  assert.equal(forged.code, 1);
  assert.match(forged.json.reason, /preview is generated by Runtime/);
  // 伪造的预览哈希不得冒充 Runtime 文件快照
  const forgedHash = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", victim, "--source-path", victim, "--preview-hash", "deadbeef".repeat(8)]);
  assert.equal(forgedHash.code, 1);
  assert.match(forgedHash.json.reason, /preview is generated by Runtime/);
  // 旧的 --confirm 布尔授权路径必须失效
  const legacyConfirm = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", victim, "--source-path", victim, "--confirm"]);
  assert.equal(legacyConfirm.code, 1);
  assert.match(legacyConfirm.json.reason, /--confirm is not accepted/);
  assert.equal(fs.existsSync(victim), true);
});

test("delete 的 source_path 与 target_path 不同时拒绝", () => {
  const { dir, storagePath } = makeStateDir();
  const previewed = path.join(storagePath, "previewed.md");
  const deleted = path.join(storagePath, "deleted.md");
  fs.writeFileSync(previewed, TEMPLATE, "utf8");
  fs.writeFileSync(deleted, TEMPLATE, "utf8");
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxRun(dir, id);
  // 预览 A 却要删除 B：必须失败关闭
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", deleted, "--source-path", previewed]);
  assert.equal(pre.code, 1);
  assert.match(JSON.stringify(pre.json.gates), /delete-path-alignment|source_path and target_path must resolve/);
  assert.equal(fs.existsSync(deleted), true);
  assert.equal(fs.existsSync(previewed), true);
});

test("确认后文件内容发生变化时 write 拒绝并要求重新确认", () => {
  const { dir, storagePath, id } = startInbox((root) => fs.writeFileSync(path.join(root, "victim.md"), TEMPLATE));
  const target = path.join(storagePath, "victim.md");
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", target, "--source-path", target]);
  assert.equal(pre.code, 0, JSON.stringify(pre.json));
  const conf = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre.json.write_cycle, "--challenge", pre.json.confirmation_challenge]);
  assert.equal(conf.code, 0);
  // 用户确认之后、write 之前文件被改动
  fs.writeFileSync(target, `${TEMPLATE}\n改动后的内容\n`, "utf8");
  const stale = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf.json.write_token,
    "--operation", "delete", "--target-path", target, "--source-path", target,
    "--confirmation", conf.json.confirmation_token]);
  assert.equal(stale.code, 1);
  assert.match(stale.json.reason, /source changed since preflight/);
  assert.equal(fs.existsSync(target), true, "文件变化后绝不能删除");
  // 必须重新 preflight + confirm 才能继续
  const pre2 = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", target, "--source-path", target]);
  assert.equal(pre2.code, 0, JSON.stringify(pre2.json));
  assert.notEqual(pre2.json.source_sha256, pre.json.source_sha256);
  const conf2 = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre2.json.write_cycle, "--challenge", pre2.json.confirmation_challenge]);
  const ok = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf2.json.write_token,
    "--operation", "delete", "--target-path", target, "--source-path", target,
    "--confirmation", conf2.json.confirmation_token]);
  assert.equal(ok.code, 0, JSON.stringify(ok.json));
  assert.equal(fs.existsSync(target), false);
});

test("confirmation token 不能跨 cycle、跨文件、跨操作重放", () => {
  const { dir, storagePath, id } = startInbox((root) => {
    fs.writeFileSync(path.join(root, "a.md"), TEMPLATE);
    fs.writeFileSync(path.join(root, "b.md"), TEMPLATE);
  });
  const a = path.join(storagePath, "a.md");
  const b = path.join(storagePath, "b.md");
  // 第一个文件：完整两阶段后取得令牌但不写
  const pre1 = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", a, "--source-path", a]);
  const conf1 = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre1.json.write_cycle, "--challenge", pre1.json.confirmation_challenge]);
  assert.equal(conf1.code, 0);
  const token1 = conf1.json.confirmation_token;
  // 第二个文件：新周期
  const pre2 = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", b, "--source-path", b]);
  assert.equal(pre2.code, 0, JSON.stringify(pre2.json));
  const conf2 = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre2.json.write_cycle, "--challenge", pre2.json.confirmation_challenge]);
  // 跨 cycle 重放：旧令牌在新周期无效
  const crossCycle = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf2.json.write_token,
    "--operation", "delete", "--target-path", b, "--source-path", b, "--confirmation", token1]);
  assert.equal(crossCycle.code, 1);
  assert.match(crossCycle.json.reason, /invalid confirmation token/);
  // 跨文件重放：同一周期令牌用于其他目标
  const crossFile = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf1.json.write_token,
    "--operation", "delete", "--target-path", b, "--source-path", b, "--confirmation", token1]);
  assert.equal(crossFile.code, 1);
  // 跨操作重放：delete 令牌用于 move
  const crossOp = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf2.json.write_token,
    "--operation", "move", "--target-path", path.join(storagePath, "moved.md"), "--source-path", b,
    "--confirmation", conf2.json.confirmation_token]);
  assert.equal(crossOp.code, 1);
  assert.match(crossOp.json.reason, /operation not authorized|invalid confirmation token/);
  assert.equal(fs.existsSync(a), true);
  assert.equal(fs.existsSync(b), true);
});

test("rejected preflight 不破坏已结算周期的审计数据", () => {
  const { dir, storagePath } = makeStateDir();
  const id = run(["start", "--state-dir", dir]).json.run_id;
  inboxRun(dir, id);
  const victim = path.join(storagePath, "victim.md");
  fs.writeFileSync(victim, TEMPLATE, "utf8");
  // 先完成一次合法删除（两阶段）
  const pre1 = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", victim, "--source-path", victim]);
  const conf1 = run(["confirm", "--state-dir", dir, "--run-id", id,
    "--cycle", pre1.json.write_cycle, "--challenge", pre1.json.confirmation_challenge]);
  const ok = run(["write", "--state-dir", dir, "--run-id", id, "--token", conf1.json.write_token,
    "--operation", "delete", "--target-path", victim, "--source-path", victim,
    "--confirmation", conf1.json.confirmation_token,
    "--output", "target_path_or_delete_confirmation=已展示预览并二次确认后删除"]);
  assert.equal(ok.code, 0, JSON.stringify(ok.json));
  const afterWrite = run(["status", "--state-dir", dir, "--run-id", id]);
  assert.equal(afterWrite.json.ledger.commit.committed, true);
  const cyclesAfterWrite = afterWrite.json.ledger.write_cycles.length;
  // 再来一次失败 preflight（文件已不存在）
  const bad = run(["preflight", "--state-dir", dir, "--run-id", id, "--operation", "delete",
    "--target-path", victim, "--source-path", victim]);
  assert.equal(bad.code, 1);
  const after = run(["status", "--state-dir", dir, "--run-id", id]);
  const ledger = after.json.ledger;
  // 已结算周期与 commit 状态完好，rejected 周期仅作审计
  assert.equal(ledger.commit.committed, true);
  assert.equal(ledger.write_cycles.filter((c) => c.state === "committed").length, 1);
  assert.equal(ledger.write_cycles.length, cyclesAfterWrite + 1);
  assert.equal(ledger.write_cycles[ledger.write_cycles.length - 1].state, "rejected");
  // 失败不应阻止 finish
  const fin = run(["finish", "--state-dir", dir, "--run-id", id]);
  assert.equal(fin.code, 0, JSON.stringify(fin.json.missing));
});
