// 写前置评估、失败关闭的写门禁、完成前验证器。
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { pendingCycle, stableStringify, previewHashOf } from "./state.mjs";

// 危险操作的文件快照必须由 Runtime 自己读取真实文件生成，不信任调用方传入的哈希。
export function readFileSnapshot(filePath) {
  try {
    if (!filePath) return { pass: false, reason: "source file path missing" };
    if (!fs.existsSync(filePath)) return { pass: false, reason: "source file does not exist" };
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink()) return { pass: false, reason: "source file must not be a symbolic link" };
    if (!stat.isFile()) return { pass: false, reason: "source must be a regular file" };
    const buf = fs.readFileSync(filePath);
    return {
      pass: true,
      sha256: crypto.createHash("sha256").update(buf).digest("hex"),
      size: buf.length,
    };
  } catch (err) {
    return { pass: false, reason: `source snapshot failed: ${err.message}` };
  }
}

// 规范预览：由 Runtime 依据真实文件生成，供用户确认；不采用调用方提供的文本或哈希。
export function renderCanonicalPreview({ operation, sourcePath, targetPath, sha256, size, excerpt }) {
  return [
    `operation: ${operation}`,
    `source: ${sourcePath}`,
    `target: ${targetPath}`,
    `size: ${size} bytes`,
    `sha256: ${sha256}`,
    "--- excerpt ---",
    excerpt ?? "",
  ].join("\n");
}

export function snapshotFields({
  operation, sourcePath, targetPath, sourceSha256, size, previewHash,
}) {
  return {
    operation,
    source_path: sourcePath ? normalize(sourcePath) : null,
    target_path: targetPath ? normalize(targetPath) : null,
    source_sha256: sourceSha256 ?? null,
    size: size ?? null,
    preview_hash: previewHash ?? null,
  };
}

export function snapshotHashOf(fields) {
  return crypto.createHash("sha256").update(stableStringify(fields), "utf8").digest("hex");
}

export function fileExcerpt(filePath, maxChars = 400) {
  try {
    return fs.readFileSync(filePath, "utf8").slice(0, maxChars);
  } catch {
    return "";
  }
}

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

function existingAncestor(p) {
  let current = path.resolve(p);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

export function realPathInsideRoot(root, target) {
  try {
    if (!root) return { pass: false, reason: "storage root not configured" };
    if (!fs.existsSync(root)) return { pass: false, reason: "storage root does not exist" };
    if (fs.lstatSync(root).isSymbolicLink()) return { pass: false, reason: "storage root cannot be a symbolic link or junction" };
    const realRoot = fs.realpathSync(root);
    const ancestor = existingAncestor(target);
    if (!ancestor) return { pass: false, reason: "target has no existing ancestor" };
    const realAncestor = fs.realpathSync(ancestor);
    if (!isInsideRoot(realRoot, realAncestor) && realAncestor !== realRoot) {
      return { pass: false, reason: "target resolves outside confirmed storage" };
    }
    let current = path.resolve(target);
    while (current !== path.resolve(root)) {
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
        return { pass: false, reason: "symbolic link or junction is not allowed" };
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return { pass: true, real_root: realRoot };
  } catch (err) { return { pass: false, reason: `real path validation failed: ${err.message}` }; }
}

function gateTargetPath(ledger, targetPath) {
  if (!targetPath) return { pass: false, reason: "target_path missing" };
  if (!path.isAbsolute(targetPath)) return { pass: false, reason: "target_path must be absolute" };
  if (String(targetPath).includes("..")) return { pass: false, reason: "path traversal not allowed" };
  if (!ledger.storage_path) return { pass: false, reason: "storage not configured" };
  if (!isInsideRoot(ledger.storage_path, targetPath)) {
    return { pass: false, reason: "target outside confirmed storage or is storage root" };
  }
  const real = realPathInsideRoot(ledger.storage_path, targetPath);
  if (!real.pass) return real;
  return { pass: true };
}

// 模板/写入内容结构校验：frontmatter 必需字段 + 标题。preflight 与 write 共用同一标准。
export function gateTemplate(templateContent, templatePath) {
  const content = templateContent ?? "";
  if (!content) return { pass: false, reason: "final_markdown required before write" };
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatter) return { pass: false, reason: "frontmatter required" };
  const required = ["source", "captured", "status", "tags", "distill_level"];
  if (required.some((key) => !new RegExp(`^${key}:`, "m").test(frontmatter[1]))) {
    return { pass: false, reason: "required frontmatter fields missing" };
  }
  if (!/^#\s+.+/m.test(frontmatter[2])) {
    return { pass: false, reason: "title required" };
  }
  return { pass: true, template_path: templatePath ?? null };
}

export const OPERATIONS = ["create", "edit", "move", "delete"];
export const DANGEROUS_OPERATIONS = new Set(["move", "delete"]);

// 操作→场景模式白名单：不允许跨模式签发授权。
export function allowedOperations(scene) {
  if (scene.mode === "write") return ["create", "edit"];
  if (scene.mode === "update") return ["edit"];
  if (scene.mode === "move-or-delete") return ["move", "delete"];
  return [];
}

export function defaultOperation(scene) {
  if (scene.mode === "update") return "edit";
  if (scene.mode === "move-or-delete") return "move";
  return "create";
}

export function evaluatePreflight(ledger, scene, {
  targetPath = null, sourcePath = null, templateContent = null, templatePath = null,
  operation = null, fileSnapshot = null, deletePathsAligned = true,
} = {}) {
  const gates = {};
  const mode = scene.mode;
  const op = operation ?? defaultOperation(scene);
  if (["write", "update", "move-or-delete"].includes(mode)) {
    gates["target-path"] = gateTargetPath(ledger, targetPath);
  }
  if (op === "create" || (op === "edit" && mode !== "update")) {
    gates["template-ready"] = gateTemplate(templateContent, templatePath);
  }
  if (DANGEROUS_OPERATIONS.has(op)) {
    // 危险操作：文件快照必须由 Runtime 生成；--preview/--preview-hash 不再作为授权依据。
    gates["source-snapshot"] = fileSnapshot && fileSnapshot.pass
      ? { pass: true, source_sha256: fileSnapshot.sha256, size: fileSnapshot.size }
      : { pass: false, reason: fileSnapshot?.reason ?? "runtime source snapshot missing" };
    // 删除只允许一个明确路径：源与目标必须解析后相同。
    gates["delete-path-alignment"] = deletePathsAligned
      ? { pass: true }
      : { pass: false, reason: "delete source_path and target_path must resolve to the same file" };
  }
  const write_allowed = Object.keys(gates).length > 0 && Object.values(gates).every((g) => g.pass);
  const write_token = write_allowed ? crypto.randomBytes(8).toString("hex") : null;
  return { gates, write_allowed, write_token, operation: op };
}

// 失败关闭：授权只在「当前 pending 周期」内有效，逐项核对操作快照。
export function checkWriteGate(ledger, { token = null, targetPath = null, sourcePath = null, operation = null } = {}) {
  if (!ledger) return { allowed: false, reason: "no run context" };
  if (ledger.blocked_reason) return { allowed: false, reason: `blocked: ${ledger.blocked_reason}` };
  const cycle = pendingCycle(ledger);
  if (!cycle) return { allowed: false, reason: "preflight not completed" };
  if (!token || token !== cycle.write_token) return { allowed: false, reason: "invalid write token" };
  if (operation && cycle.operation && operation !== cycle.operation) {
    return { allowed: false, reason: `operation not authorized by preflight: ${operation} (authorized: ${cycle.operation})` };
  }
  if (targetPath && cycle.target_path && normalize(targetPath) !== normalize(cycle.target_path)) {
    return { allowed: false, reason: "target differs from preflight-approved path" };
  }
  if (sourcePath && cycle.source_path && normalize(sourcePath) !== normalize(cycle.source_path)) {
    return { allowed: false, reason: "source differs from preflight-approved path" };
  }
  return { allowed: true, cycle };
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
    missing.push(...validateWriteCycles(ledger).missing);
  }
  if (ledger.blocked_reason) missing.push(`run blocked: ${ledger.blocked_reason}`);
  return { ok: missing.length === 0, missing };
}

// 逐条校验一个已结算周期的回执与快照一致性；返回问题列表（空数组表示通过）。
function validateCommittedCycle(cycle, ledger) {
  const problems = [];
  const id = cycle.id;
  const receipt = cycle.receipt;
  if (!receipt) return [`cycle ${id}: missing receipt`];
  if (receipt.ok !== true) problems.push(`cycle ${id}: receipt.ok is not true`);
  if (receipt.tool !== "hub-runtime") problems.push(`cycle ${id}: receipt.tool is not hub-runtime`);
  if (!receipt.runtime_write_id) problems.push(`cycle ${id}: receipt.runtime_write_id missing`);
  if (receipt.write_cycle !== id) problems.push(`cycle ${id}: receipt.write_cycle mismatch (${receipt.write_cycle})`);
  if (receipt.operation !== cycle.operation) problems.push(`cycle ${id}: receipt.operation mismatch (${receipt.operation} != ${cycle.operation})`);
  if (cycle.source_path && receipt.source_path && normalize(receipt.source_path) !== normalize(cycle.source_path)) {
    problems.push(`cycle ${id}: receipt.source_path mismatch`);
  }
  if (cycle.target_path && receipt.target_path && normalize(receipt.target_path) !== normalize(cycle.target_path)) {
    problems.push(`cycle ${id}: receipt.target_path mismatch`);
  }
  if (receipt.preview_hash !== (cycle.preview_hash ?? null)) problems.push(`cycle ${id}: receipt.preview_hash mismatch`);
  if (receipt.snapshot_hash !== (cycle.snapshot_hash ?? null)) problems.push(`cycle ${id}: receipt.snapshot_hash mismatch`);
  if (receipt.source_sha256 !== (cycle.source_sha256 ?? null)) problems.push(`cycle ${id}: receipt.source_sha256 mismatch`);
  // 回执必须能在写入记录里找到同一次写入，防止凭空声明
  const writes = ledger?.writes || [];
  if (receipt.runtime_write_id
    && !writes.some((w) => w.id === receipt.runtime_write_id)) {
    problems.push(`cycle ${id}: no write record for runtime_write_id ${receipt.runtime_write_id}`);
  }
  return problems;
}

// 写入周期校验：全部已结算周期逐项核对；未结算/待确认周期阻止完成；rejected 仅审计。
export function validateWriteCycles(ledger) {
  const missing = [];
  const cycles = ledger?.write_cycles || [];
  // 未结算周期：pending（已签发可执行令牌）与 awaiting_confirmation（待用户二阶段确认）
  for (const c of cycles.filter((x) => x.state === "pending")) {
    missing.push(`pending write cycle not settled: ${c.id} (${c.operation ?? "unknown"})`);
  }
  for (const c of cycles.filter((x) => x.state === "awaiting_confirmation")) {
    missing.push(`write cycle awaiting user confirmation: ${c.id} (${c.operation ?? "unknown"})`);
  }
  const committed = cycles.filter((c) => c.state === "committed");
  if (committed.length === 0) {
    missing.push("no committed write cycle");
    return { ok: false, missing };
  }
  // 遍历全部已结算周期，不只验证最后一个
  for (const cycle of committed) {
    missing.push(...validateCommittedCycle(cycle, ledger));
  }
  return { ok: missing.length === 0, missing };
}
