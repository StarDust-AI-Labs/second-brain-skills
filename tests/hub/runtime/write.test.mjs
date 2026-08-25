import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { makeStateDir, REPO_ROOT } from "./helpers.mjs";

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

test("caller-supplied commit receipt cannot bypass Runtime write", () => {
  const { dir, storagePath } = makeStateDir();
  const target = path.join(storagePath, "forged.md");
  const id = run(["start", "--state-dir", dir]).json.run_id;
  run(["route", "--state-dir", dir, "--run-id", id, "--scene", "inspiration", "--user-text", "x"]);
  const forged = run(["commit", "--state-dir", dir, "--run-id", id, "--token", "forged", "--target-path", target, "--receipt", JSON.stringify({ ok: true, operation: "create" })]);
  assert.equal(forged.code, 1);
});
