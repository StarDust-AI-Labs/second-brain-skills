import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repository = path.resolve(import.meta.dirname, "..");
const installer = path.join(repository, "skills", "second-brain-hub", "scripts", "install.mjs");
const sourceSkills = path.join(repository, "skills");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "second-brain-install-"));

function run(args) {
  const result = spawnSync(process.execPath, [installer, ...args], { encoding: "utf8" });
  assert.equal(result.stderr.includes("Error"), false, result.stderr);
  return { ...result, json: JSON.parse(result.stdout) };
}

try {
  const target = path.join(temporaryRoot, "agent-skills");
  const vault = path.join(temporaryRoot, "knowledge-base");

  const dryRun = run([
    "--skills-dir", target,
    "--source-dir", sourceSkills,
    "--vault", vault,
    "--mode", "obsidian",
    "--dry-run",
    "--agent", "test-agent",
  ]);
  assert.equal(dryRun.status, 0);
  assert.equal(dryRun.json.dry_run, true);
  assert.equal(fs.existsSync(target), false);
  assert.equal(dryRun.json.stages.at(-1).status, "skip");

  const fresh = run([
    "--skills-dir", target,
    "--source-dir", sourceSkills,
    "--vault", vault,
    "--mode", "obsidian",
    "--yes",
    "--agent", "test-agent",
  ]);
  assert.equal(fresh.status, 0);
  assert.equal(fresh.json.status, "success");
  for (const skill of ["second-brain-hub", "defuddle", "obsidian-markdown", "obsidian-cli", "obsidian-bases", "json-canvas"]) {
    assert.equal(fs.existsSync(path.join(target, skill, "SKILL.md")), true, `${skill} should be installed`);
  }
  assert.equal(fs.existsSync(path.join(vault, ".obsidian")), true);
  assert.equal(fs.existsSync(path.join(target, ".second-brain-install.json")), true);
  const statePath = path.join(target, "second-brain-hub", "hub-state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(state.preferences.storage_mode, "obsidian");
  assert.equal(state.preferences.vault_path, vault);

  state.preferences.workspace_name = "Preserved State";
  fs.writeFileSync(statePath, `\uFEFF${JSON.stringify(state)}`, "utf8");
  const update = run([
    "--skills-dir", target,
    "--source-dir", sourceSkills,
    "--vault", vault,
    "--mode", "obsidian",
    "--yes",
    "--agent", "test-agent",
  ]);
  assert.equal(update.status, 0);
  assert.equal(update.json.stages.find((item) => item.stage === "stage-1-mode").mode, "update");
  assert.equal(fs.readdirSync(target).some((name) => name.startsWith(".second-brain-backup-")), true);
  const preserved = JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, ""));
  assert.equal(preserved.preferences.workspace_name, "Preserved State");

  const unsafe = run([
    "--skills-dir", path.parse(temporaryRoot).root,
    "--source-dir", sourceSkills,
    "--dry-run",
  ]);
  assert.equal(unsafe.status, 2);
  assert.match(unsafe.json.reason, /filesystem root/);

  process.stdout.write("install-script.test.mjs: PASS\n");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
