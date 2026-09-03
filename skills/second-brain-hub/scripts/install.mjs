import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SKILLS = [
  "second-brain-hub",
  "defuddle",
  "obsidian-markdown",
  "obsidian-cli",
  "obsidian-bases",
  "json-canvas",
];

const HIDDEN_DEPENDENCY_NAMES = new Set([
  "defuddle",
  "json-canvas",
  "obsidian-bases",
  "obsidian-cli",
  "obsidian-markdown",
]);

const EXIT = { ok: 0, failed: 1, needInput: 2 };
const SCRIPT_PATH = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const flags = { _: [] };
  const valueFlags = new Set(["skills-dir", "vault", "mode", "source-dir", "agent"]);
  const booleanFlags = new Set(["yes", "dry-run", "update", "help"]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      flags._.push(arg);
      continue;
    }
    const [rawName, inlineValue] = arg.slice(2).split("=", 2);
    if (booleanFlags.has(rawName)) {
      if (inlineValue !== undefined) throw new Error(`--${rawName} does not accept a value`);
      flags[rawName] = true;
      continue;
    }
    if (!valueFlags.has(rawName)) throw new Error(`Unknown option: --${rawName}`);
    const value = inlineValue ?? argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`--${rawName} needs a value`);
    flags[rawName] = value;
  }

  if (flags.yes && flags["dry-run"]) throw new Error("--yes and --dry-run cannot be used together");
  if (flags.mode && !["obsidian", "markdown"].includes(flags.mode)) {
    throw new Error("--mode must be obsidian or markdown");
  }
  return flags;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, value) {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temp, file);
}

function isAbsolutePath(value) {
  return Boolean(value) && path.isAbsolute(value);
}

function assertSafeDirectory(value, label) {
  if (!isAbsolutePath(value)) throw new Error(`--${label} must be an absolute path`);
  const target = path.resolve(value);
  const root = path.parse(target).root;
  const home = path.resolve(process.env.USERPROFILE || process.env.HOME || root);
  if (target === root || target === home) {
    throw new Error(`Refusing to use a filesystem root or user home directory for --${label}`);
  }
  return target;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true });
  return {
    ok: result.status === 0,
    code: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function gitInfo(sourceRoot) {
  const root = run("git", ["-C", sourceRoot, "rev-parse", "--show-toplevel"]);
  if (!root.ok) return { available: false, repository: null, commit: null, root: null };
  const repoRoot = root.stdout.trim();
  const commit = run("git", ["-C", repoRoot, "rev-parse", "HEAD"]);
  const remote = run("git", ["-C", repoRoot, "config", "--get", "remote.origin.url"]);
  return {
    available: true,
    repository: remote.ok ? remote.stdout.trim() : null,
    commit: commit.ok ? commit.stdout.trim() : null,
    root: repoRoot,
  };
}

function hasSkillSet(root) {
  return SKILLS.every((name) => fs.existsSync(path.join(root, name, "SKILL.md")));
}

function findSourceRoot(explicit) {
  if (explicit) {
    const root = assertSafeDirectory(explicit, "source-dir");
    if (!hasSkillSet(root)) throw new Error(`--source-dir does not contain all six Skill directories: ${root}`);
    return root;
  }

  const candidates = [];
  let current = path.resolve(SCRIPT_PATH);
  for (let i = 0; i < 8; i += 1) {
    candidates.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return candidates.find((candidate) => hasSkillSet(candidate)) || null;
}

function inferAgent(target, explicit) {
  if (explicit) return explicit;
  const value = String(target || "").toLowerCase();
  if (value.includes(".workbuddy")) return "workbuddy";
  if (value.includes(".cursor")) return "cursor";
  if (value.includes(".claude")) return "claude-code";
  if (value.includes(".codex")) return "codex";
  if (value.includes(".coze")) return "coze";
  return process.env.SECOND_BRAIN_AGENT || "unknown";
}

function candidateDirectories() {
  const bases = new Set();
  const cwd = path.resolve(process.cwd());
  const home = path.resolve(process.env.USERPROFILE || process.env.HOME || cwd);
  bases.add(cwd);
  bases.add(home);
  for (const envName of ["CODEX_HOME", "CLAUDE_CONFIG_DIR", "WORKBUDDY_HOME", "XDG_CONFIG_HOME"]) {
    if (process.env[envName]) bases.add(path.resolve(process.env[envName]));
  }

  const suffixes = [
    ".claude/skills",
    ".cursor/skills",
    ".agents/skills",
    ".coze/skills",
    ".workbuddy/skills",
    ".codex/skills",
    "skills",
  ];
  const candidates = [];
  for (const base of bases) {
    for (const suffix of suffixes) {
      const candidate = path.resolve(base, suffix);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) candidates.push(candidate);
    }
  }
  return [...new Set(candidates)];
}

function chooseRecommended(candidates) {
  if (candidates.length === 0) return null;
  const scored = candidates.map((candidate) => {
    let score = 0;
    if (fs.existsSync(path.join(candidate, "second-brain-hub", "SKILL.md"))) score += 100;
    if (candidate.toLowerCase().includes(".codex")) score += 20;
    if (candidate.toLowerCase().includes(".claude")) score += 15;
    if (candidate.toLowerCase().includes(".workbuddy")) score += 10;
    return { candidate, score };
  }).sort((a, b) => b.score - a.score);
  if (scored.length === 1) return scored[0].candidate;
  if (scored[0].score >= 100 && scored[0].score > scored[1].score) return scored[0].candidate;
  return null;
}

function parseInitOutput(output) {
  try {
    return JSON.parse(output.trim());
  } catch {
    return null;
  }
}

function formatSelfCheck({ agent, mode, result, failedStage = "none", gitAvailable }) {
  const osName = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : process.platform;
  return `【安装自检】platform=${agent} | os=${osName} | mode=${mode || "none"} | node=${process.version} | git=${gitAvailable ? "yes" : "no"} | result=${result} | failed_stage=${failedStage}`;
}

function sourceCopyFilter(source) {
  const name = path.basename(source);
  return name !== "hub-state.json"
    && name !== "hub-runs"
    && !name.startsWith(".second-brain-backup-")
    && name !== ".second-brain-install.json";
}

function copySkillSet(sourceRoot, targetRoot, mode) {
  fs.mkdirSync(targetRoot, { recursive: true });
  let backupPath = null;
  const existingStatePath = path.join(targetRoot, "second-brain-hub", "hub-state.json");
  const existingState = fs.existsSync(existingStatePath) ? fs.readFileSync(existingStatePath) : null;

  if (mode === "update") {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    backupPath = path.join(targetRoot, `.second-brain-backup-${stamp}`);
    let suffix = 1;
    while (fs.existsSync(backupPath)) backupPath = path.join(targetRoot, `.second-brain-backup-${stamp}-${suffix++}`);
    fs.mkdirSync(backupPath, { recursive: true });
    for (const name of SKILLS) {
      const source = path.join(targetRoot, name);
      if (fs.existsSync(source)) fs.cpSync(source, path.join(backupPath, name), { recursive: true });
    }
    const manifest = path.join(targetRoot, ".second-brain-install.json");
    if (fs.existsSync(manifest)) fs.copyFileSync(manifest, path.join(backupPath, ".second-brain-install.json"));
  }

  for (const name of SKILLS) {
    const source = path.join(sourceRoot, name);
    const target = path.join(targetRoot, name);
    fs.cpSync(source, target, { recursive: true, force: true, filter: sourceCopyFilter });
  }

  if (existingState) {
    fs.mkdirSync(path.dirname(existingStatePath), { recursive: true });
    fs.writeFileSync(existingStatePath, existingState);
  }
  return backupPath;
}

function makeHubState(examplePath, mode, vault) {
  const state = readJson(examplePath);
  if (!state) throw new Error(`Invalid hub-state.example.json: ${examplePath}`);
  const name = path.basename(vault);
  state.updated = new Date().toISOString().slice(0, 10);
  state.preferences = {
    ...(state.preferences || {}),
    storage_mode: mode,
    workspace_path: vault,
    workspace_name: name,
    vault_path: vault,
    vault_name: name,
  };
  state.onboarding = {
    ...(state.onboarding || {}),
    completed: true,
    first_success_at: null,
    examples_shown: false,
  };
  return state;
}

function stage(stages, name, status, detail, next, data = {}) {
  const value = { stage: name, status, detail, next, ...data };
  stages.push(value);
  return value;
}

function human(message) {
  process.stderr.write(`[install] ${message}\n`);
}

function finish({ stages, dryRun, exitCode, targetRoot, sourceRoot, selfCheck, reason = null }) {
  const payload = {
    ok: exitCode === EXIT.ok,
    command: "install",
    status: exitCode === EXIT.needInput ? "need-input" : exitCode === EXIT.ok ? "success" : "failed",
    exit_code: exitCode,
    dry_run: dryRun,
    target_skills_dir: targetRoot,
    source_skills_dir: sourceRoot,
    stages,
    self_check: selfCheck,
    reason,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  return exitCode;
}

function printHelp() {
  process.stderr.write(`Usage: node install.mjs [options]\n\n` +
    `Options:\n` +
    `  --skills-dir <abs>  Target Agent skills directory\n` +
    `  --source-dir <abs> Source skills directory (auto-detected by default)\n` +
    `  --vault <abs>      Knowledge base path\n` +
    `  --mode <mode>      obsidian | markdown\n` +
    `  --yes              Apply the plan (default is dry-run)\n` +
    `  --dry-run          Preview only\n` +
    `  --update           Force update mode when existing Skills are found\n` +
    `  --agent <name>     Agent name written to the local manifest\n`);
}

function main(argv) {
  let flags;
  try {
    flags = parseArgs(argv);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, command: "install", status: "failed", exit_code: EXIT.needInput, reason: error.message })}\n`);
    return EXIT.needInput;
  }
  if (flags.help) {
    printHelp();
    process.stdout.write(`${JSON.stringify({ ok: true, command: "install", status: "help" })}\n`);
    return EXIT.ok;
  }

  const dryRun = !flags.yes;
  const stages = [];
  let targetRoot = null;
  let sourceRoot = null;
  let selfCheck = null;
  let exitCode = EXIT.ok;
  let reason = null;

  try {
    sourceRoot = findSourceRoot(flags["source-dir"]);
  } catch (error) {
    stage(stages, "stage-0-environment", "fail", error.message, "provide a valid --source-dir");
    return finish({ stages, dryRun, exitCode: EXIT.failed, targetRoot, sourceRoot, selfCheck, reason: error.message });
  }

  const candidates = candidateDirectories().filter((candidate) => !sourceRoot || path.resolve(candidate) !== path.resolve(sourceRoot));
  let explicitTarget = null;
  try {
    explicitTarget = flags["skills-dir"] ? assertSafeDirectory(flags["skills-dir"], "skills-dir") : null;
  } catch (error) {
    stage(stages, "stage-0-environment", "fail", error.message, "provide a concrete child directory");
    return finish({ stages, dryRun, exitCode: EXIT.needInput, targetRoot, sourceRoot, selfCheck, reason: error.message });
  }
  targetRoot = explicitTarget || chooseRecommended(candidates);
  const agent = inferAgent(targetRoot, flags.agent);
  const gitAvailable = Boolean(run("git", ["--version"]).ok);
  stage(stages, "stage-0-environment", "ok", "Environment and candidate skills directories detected", targetRoot ? "inspect target" : "ask user to choose --skills-dir", {
    node: process.version,
    os: process.platform,
    git: gitAvailable,
    candidate_skills_dirs: candidates,
    recommended_skills_dir: targetRoot,
    agent_type: agent,
  });
  human(targetRoot ? `Target skills directory: ${targetRoot}` : "No unique target skills directory was detected");

  if (!targetRoot) {
    stage(stages, "stage-1-mode", "need-input", "More than one or no Agent skills directory is available", "rerun with --skills-dir <absolute path>");
    return finish({ stages, dryRun, exitCode: EXIT.needInput, targetRoot, sourceRoot, selfCheck, reason: "skills directory needs user confirmation" });
  }

  const existing = SKILLS.filter((name) => fs.existsSync(path.join(targetRoot, name)));
  const manifestPath = path.join(targetRoot, ".second-brain-install.json");
  const existingManifest = readJson(manifestPath);
  const installMode = flags.update || existing.length > 0 ? "update" : "fresh";
  if (existing.length > 0 && !existingManifest) {
    stage(stages, "stage-1-mode", "need-input", "Existing Skill directories have no trusted second-brain install manifest", "inspect the existing directories, then rerun with an explicit decision", { existing_skills: existing });
    return finish({ stages, dryRun, exitCode: EXIT.needInput, targetRoot, sourceRoot, selfCheck, reason: "existing Skill source is unknown" });
  }
  stage(stages, "stage-1-mode", "ok", `${installMode} mode selected`, "locate local source Skills", { mode: installMode, existing_skills: existing });

  if (!sourceRoot) {
    stage(stages, "stage-2-source", "need-input", "The installer could not locate a local source containing all six Skills", "rerun with --source-dir <absolute path>");
    return finish({ stages, dryRun, exitCode: EXIT.needInput, targetRoot, sourceRoot, selfCheck, reason: "source Skills not found" });
  }
  if (path.resolve(sourceRoot) === path.resolve(targetRoot)) {
    stage(stages, "stage-2-source", "fail", "Source and target skills directories are the same; refusing self-copy", "run the installer from an extracted package or provide --source-dir");
    return finish({ stages, dryRun, exitCode: EXIT.failed, targetRoot, sourceRoot, selfCheck, reason: "source equals target" });
  }
  const git = gitInfo(sourceRoot);
  stage(stages, "stage-2-source", "ok", "Local source Skills validated", "plan Skill copy", { source_root: sourceRoot, source_repository: git.repository, source_commit: git.commit });

  let backupPath = null;
  try {
    if (dryRun) {
      stage(stages, "stage-3-copy", "ok", `Would copy ${SKILLS.length} Skills`, "write install manifest", { operations: SKILLS.map((name) => ({ skill: name, status: existing.includes(name) ? "update" : "create" })) });
    } else {
      backupPath = copySkillSet(sourceRoot, targetRoot, installMode);
      stage(stages, "stage-3-copy", "ok", `Copied ${SKILLS.length} Skills`, "write install manifest", { backup_path: backupPath, operations: SKILLS.map((name) => ({ skill: name, status: "installed" })) });
    }
  } catch (error) {
    stage(stages, "stage-3-copy", "fail", error.message, "fix permissions or choose another target directory");
    return finish({ stages, dryRun, exitCode: EXIT.failed, targetRoot, sourceRoot, selfCheck, reason: error.message });
  }

  const manifest = {
    schema_version: "1.0",
    source_repository: git.repository || "local-package",
    source_commit: git.commit,
    installed_at: new Date().toISOString(),
    agent_type: agent,
    install_mode: installMode,
    skills: SKILLS.map((name) => ({ name, path: name })),
    mode: flags.mode || null,
    version: git.commit ? git.commit.slice(0, 12) : "local-package",
  };
  try {
    if (dryRun) stage(stages, "stage-4-manifest", "ok", `Would write ${path.basename(manifestPath)}`, "initialize the knowledge base", { manifest });
    else {
      writeJsonAtomic(manifestPath, manifest);
      stage(stages, "stage-4-manifest", "ok", `Wrote ${path.basename(manifestPath)}`, "initialize the knowledge base", { manifest_path: manifestPath });
    }
  } catch (error) {
    stage(stages, "stage-4-manifest", "fail", error.message, "fix target directory permissions");
    return finish({ stages, dryRun, exitCode: EXIT.failed, targetRoot, sourceRoot, selfCheck, reason: error.message });
  }

  let vault = null;
  try {
    vault = flags.vault ? assertSafeDirectory(flags.vault, "vault") : null;
  } catch (error) {
    stage(stages, "stage-5-initialize", "fail", error.message, "provide a concrete knowledge base directory");
    return finish({ stages, dryRun, exitCode: EXIT.needInput, targetRoot, sourceRoot, selfCheck, reason: error.message });
  }
  if (!vault || !flags.mode) {
    stage(stages, "stage-5-initialize", "need-input", !vault ? "Skills are installed, but the knowledge base path is not selected" : "Knowledge base mode is missing", "rerun with --vault <absolute path> --mode <obsidian|markdown>");
    exitCode = EXIT.needInput;
  } else {
    const initScript = path.join(sourceRoot, "second-brain-hub", "scripts", "init-workspace.mjs");
    const initArgs = [initScript, "--path", vault, ...(flags.mode === "obsidian" ? ["--obsidian"] : []), ...(dryRun ? ["--dry-run"] : [])];
    const init = run(process.execPath, initArgs, sourceRoot);
    const initJson = parseInitOutput(init.stdout);
    if (!init.ok || !initJson) {
      stage(stages, "stage-5-initialize", "fail", init.stderr.trim() || "init-workspace.mjs did not return valid JSON", "fix the knowledge base path or permissions");
      exitCode = EXIT.failed;
      reason = "knowledge base initialization failed";
    } else {
      const statePath = path.join(targetRoot, "second-brain-hub", "hub-state.json");
      const currentState = readJson(statePath);
      if (dryRun) {
        stage(stages, "stage-5-initialize", "ok", "Would initialize PARA directories and hub-state.json", "run again with --yes to apply", { init: initJson, hub_state_path: statePath });
      } else if (currentState) {
        stage(stages, "stage-5-initialize", "ok", "Existing hub-state.json preserved", "run the normal Hub onboarding flow if the selected path differs", { init: initJson, hub_state_path: statePath, preserved: true });
      } else {
        const state = makeHubState(path.join(sourceRoot, "second-brain-hub", "hub-state.example.json"), flags.mode, vault);
        writeJsonAtomic(statePath, state);
        stage(stages, "stage-5-initialize", "ok", "Initialized PARA directories and hub-state.json", "run final self-check", { init: initJson, hub_state_path: statePath });
      }
    }
  }

  const expectedTarget = path.join(targetRoot, "second-brain-hub");
  if (dryRun) {
    selfCheck = formatSelfCheck({ agent, mode: flags.mode, result: "planned", failedStage: "none", gitAvailable });
    stage(stages, "stage-6-self-check", "skip", "Self-check deferred because this was a dry-run", "rerun with --yes after reviewing the plan", { self_check: selfCheck });
  } else {
    const missingSkills = SKILLS.filter((name) => !fs.existsSync(path.join(targetRoot, name, "SKILL.md")));
    const hiddenDependencies = readJson(path.join(expectedTarget, "dependencies.json"))?.dependencies || [];
    const missingDependencies = hiddenDependencies
      .filter((item) => item.visibility === "hidden" && item.install_with_parent)
      .map((item) => item.name)
      .filter((name) => !HIDDEN_DEPENDENCY_NAMES.has(name) || !fs.existsSync(path.join(targetRoot, name, "SKILL.md")));
    let vaultCheck = "skipped";
    if (vault) {
      const probe = path.join(vault, `.second-brain-install-check-${process.pid}-${Date.now()}.md`);
      try {
        fs.writeFileSync(probe, "install check\n", "utf8");
        fs.rmSync(probe, { force: true });
        vaultCheck = "pass";
      } catch {
        vaultCheck = "fail";
      }
    }
    const failed = missingSkills.length > 0 || vaultCheck === "fail";
    const degraded = !failed && missingDependencies.length > 0;
    const result = failed ? "failed" : degraded ? "degraded" : "success";
    selfCheck = formatSelfCheck({ agent, mode: flags.mode, result, failedStage: failed ? "stage-6-self-check" : "none", gitAvailable });
    stage(stages, "stage-6-self-check", failed ? "fail" : degraded ? "degraded" : "ok", selfCheck, failed ? "inspect missing files or permissions" : "installation complete", { self_check: selfCheck, missing_skills: missingSkills, missing_dependencies: missingDependencies, vault_write: vaultCheck, backup_path: backupPath });
    if (failed) {
      exitCode = EXIT.failed;
      reason = "final self-check failed";
    }
  }

  return finish({ stages, dryRun, exitCode, targetRoot, sourceRoot, selfCheck, reason });
}

const exitCode = main(process.argv.slice(2));
process.exitCode = exitCode;
