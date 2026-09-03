import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SKILL_ROOT, REPO_ROOT } from "./helpers.mjs";

const PROTOCOL = path.join(SKILL_ROOT, "references", "runtime-protocol.md");
const BUDGET = path.join(REPO_ROOT, "tests", "hub", "context-budget.json");
const SKILL_MD = path.join(SKILL_ROOT, "SKILL.md");

function read(relative) {
  return fs.readFileSync(relative, "utf8");
}

test("runtime-protocol 保留 onboarding setup_trigger 传输规则", () => {
  const protocol = read(PROTOCOL);
  // 校验脚本同样要求这四个令牌，回归测试守住不被后续改动删除
  for (const token of ["setup_trigger=null", "post-install-prompt", "runtime-missing-config", "explicit-reset-or-repair"]) {
    assert.ok(protocol.includes(token), `runtime-protocol.md missing onboarding token: ${token}`);
  }
  assert.match(protocol, /pending_request/);
  // 传输字段不得写进 hub-state.json
  assert.match(protocol, /never written to `hub-state\.json`/);
});

test("runtime-protocol 声明写入周期与操作快照语义", () => {
  const protocol = read(PROTOCOL);
  for (const token of ["pending write cycle", "operation", "source_path", "target_path", "preview_hash", "confirmation_token"]) {
    assert.ok(protocol.includes(token), `runtime-protocol.md missing write authorization token: ${token}`);
  }
  // 已移除的 commit 命令不得再出现在协议中
  assert.equal(/\bcommit\b/.test(protocol), false, "commit command must not be documented anymore");
});

test("固定加载上下文不超过 10000 字节预算", () => {
  const budget = JSON.parse(read(BUDGET));
  const fixedBytes = budget.fixed_load_files
    .map((f) => fs.statSync(path.join(REPO_ROOT, f)).size)
    .reduce((sum, n) => sum + n, 0);
  assert.ok(fixedBytes <= budget.max_fixed_bytes, `fixed context ${fixedBytes} > ${budget.max_fixed_bytes}`);
  assert.ok(budget.fixed_load_files.includes("skills/second-brain-hub/SKILL.md"));
});

test("SKILL.md 仍声明第二大脑场景必经运行时", () => {
  const skill = read(SKILL_MD);
  assert.match(skill, /hub-runtime\.mjs/);
  assert.match(skill, /禁止用其他工具直写 Vault/);
  assert.equal(/\bcommit\b/.test(skill), false, "SKILL.md must not reference the removed commit command");
});
