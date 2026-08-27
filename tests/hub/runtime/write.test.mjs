import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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

test("delete requires the preflight-issued confirmation token", () => {
  const { dir, storagePath } = makeStateDir();
  const target = path.join(storagePath, "victim.md");
  fs.writeFileSync(target, TEMPLATE, "utf8");
  const id = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", id, "--scene", "inbox", "--user-text", "删掉这个"]);
  const inbox = loadContracts(SKILL_ROOT).route.scenes.find((s) => s.id === "inbox");
  const writeStep = inbox.step_order[inbox.step_order.length - 1];
  for (const s of inbox.step_order) {
    if (s === writeStep) continue;
    const isConditional = (inbox.conditional_steps || []).some((c) => c.id === s);
    run(isConditional
      ? ["step", "--state-dir", dir, "--run-id", id, "--step", s, "--skip", "--reason", "n/a"]
      : ["step", "--state-dir", dir, "--run-id", id, "--step", s, "--evidence", "ok"]);
  }
  // 删除确认：必须 --confirm 且回传 preflight 签发的 confirmation token
  const pre = run(["preflight", "--state-dir", dir, "--run-id", id, "--target-path", target, "--confirm"]);
  assert.equal(pre.code, 0, JSON.stringify(pre.json));
  assert.ok(pre.json.write_token);
  const noToken = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token, "--operation", "delete", "--target-path", target]);
  assert.equal(noToken.code, 1);
  assert.match(noToken.json.reason, /delete requires explicit confirmation token/);
  assert.equal(fs.existsSync(target), true);
  const token = JSON.parse(fs.readFileSync(path.join(dir, "hub-runs", `${id}.json`), "utf8")).preflight.confirmation_token;
  assert.ok(token);
  const ok = run(["write", "--state-dir", dir, "--run-id", id, "--token", pre.json.write_token, "--operation", "delete", "--target-path", target, "--confirmation", token]);
  assert.equal(ok.code, 0, JSON.stringify(ok.json));
  assert.equal(fs.existsSync(target), false);
});
