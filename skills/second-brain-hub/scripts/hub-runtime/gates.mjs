// 写前置评估、失败关闭的写门禁、完成前验证器。
import path from "node:path";
import crypto from "node:crypto";

export function normalize(p) {
  return path.resolve(p);
}

// 目标必须在存储根之内，且不得是根本身（防整库覆盖）。
export function isInsideRoot(root, target) {
  if (!root || !target) return false;
  const r = normalize(root);
  const t = normalize(target);
  if (t === r) return false;
  return t.startsWith(r.endsWith(path.sep) ? r : r + path.sep);
}

function gateTargetPath(ledger, targetPath) {
  if (!targetPath) return { pass: false, reason: "target_path missing" };
  if (!path.isAbsolute(targetPath)) return { pass: false, reason: "target_path must be absolute" };
  if (String(targetPath).includes("..")) return { pass: false, reason: "path traversal not allowed" };
  if (!ledger.storage_path) return { pass: false, reason: "storage not configured" };
  if (!isInsideRoot(ledger.storage_path, targetPath)) {
    return { pass: false, reason: "target outside confirmed storage or is storage root" };
  }
  return { pass: true };
}

function gateTemplate(templateContent, templatePath) {
  const content = templateContent ?? "";
  const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---/.test(content);
  if (content && hasFrontmatter) return { pass: true };
  if (templatePath) return { pass: true, note: "template file registered" };
  return { pass: false, reason: "final_markdown with frontmatter required before write" };
}

export function evaluatePreflight(ledger, scene, {
  targetPath = null, templateContent = null, templatePath = null, auth = false,
} = {}) {
  const gates = {};
  const mode = scene.mode;
  if (["write", "update", "move-or-delete"].includes(mode)) {
    gates["target-path"] = gateTargetPath(ledger, targetPath);
  }
  if (mode === "write") {
    gates["template-ready"] = gateTemplate(templateContent, templatePath);
  }
  if (mode === "move-or-delete") {
    gates["destination-or-delete-confirmation"] = auth
      ? { pass: true }
      : { pass: false, reason: "explicit per-item delete/move confirmation required" };
  }
  const write_allowed = Object.keys(gates).length > 0 && Object.values(gates).every((g) => g.pass);
  const write_token = write_allowed ? crypto.randomBytes(8).toString("hex") : null;
  return { gates, write_allowed, write_token };
}

// 失败关闭：缺少运行、前置、令牌或处于阻塞 → 拒绝写入。
export function checkWriteGate(ledger, { token = null, targetPath = null } = {}) {
  if (!ledger) return { allowed: false, reason: "no run context" };
  if (ledger.blocked_reason) return { allowed: false, reason: `blocked: ${ledger.blocked_reason}` };
  if (!ledger.preflight?.checked) return { allowed: false, reason: "preflight not completed" };
  if (!ledger.preflight.write_allowed) return { allowed: false, reason: "preflight gates failed" };
  if (!token || token !== ledger.preflight.write_token) return { allowed: false, reason: "invalid write token" };
  if (targetPath && ledger.preflight.target_path
    && normalize(targetPath) !== normalize(ledger.preflight.target_path)) {
    return { allowed: false, reason: "target differs from preflight-approved path" };
  }
  return { allowed: true };
}

// 完成前验证：禁止 agent 自我宣布完成。
export function validateCompletion(ledger, scene) {
  const missing = [];
  for (const step of scene.required_steps) {
    if (!ledger.steps.completed.includes(step)) missing.push(`required step not completed: ${step}`);
  }
  for (const cond of scene.conditional_steps || []) {
    const done = ledger.steps.completed.includes(cond.id);
    const skipped = Boolean(ledger.steps.skipped[cond.id]);
    if (!done && !skipped) missing.push(`conditional step needs run or skip evidence: ${cond.id}`);
  }
  for (const out of scene.required_outputs || []) {
    const [name, expected] = out.split("=");
    const val = ledger.steps.outputs[name];
    if (val === undefined) missing.push(`required output missing: ${name}`);
    else if (expected !== undefined && String(val) !== expected) missing.push(`required output mismatch: ${out}`);
  }
  if (["write", "update", "move-or-delete"].includes(scene.mode)) {
    if (!ledger.preflight?.write_allowed) missing.push("write preflight not passed");
    if (!ledger.commit?.committed) missing.push("write not committed");
  }
  if (ledger.blocked_reason) missing.push(`run blocked: ${ledger.blocked_reason}`);
  return { ok: missing.length === 0, missing };
}
