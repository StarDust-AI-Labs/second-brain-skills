# 第二大脑工作流执行稳定性优化 — 验收报告

日期：2026-08-24
分支：`feat/hub-workflow-stability`
范围：P0（运行时闭环）+ P1（协议重写）+ P2（部分：行为回归用例）

## 变更范围

| 层 | 文件 | 说明 |
|---|---|---|
| 运行时 | `skills/second-brain-hub/scripts/hub-runtime.mjs` | 公开入口 |
| 运行时 | `scripts/hub-runtime/state.mjs` | 台账 + 状态机 |
| 运行时 | `scripts/hub-runtime/contracts.mjs` | 契约读取 |
| 运行时 | `scripts/hub-runtime/render.mjs` | 确定性地图卡/完成卡 |
| 运行时 | `scripts/hub-runtime/gates.mjs` | 写前置 / 失败关闭写门禁 / 完成验证器 |
| 运行时 | `scripts/hub-runtime/cli.mjs` | 命令编排（8 命令） |
| 测试 | `tests/hub/runtime/*.test.mjs` | 37 个用例 |
| 协议 | `SKILL.md`、`references/runtime-protocol.md`、`references/writing-pipeline.md` | 顶部协议重写，声明第二大脑场景必经 runtime |
| 行为 | `tests/hub/behavior-cases.json` | 新增 b18（忽略流程注入）/ b19（普通写入不误拦） |
| 其余 | `.gitignore`、`docs/runbooks/hub-e2e-validation.md` | 忽略 `hub-runs/`；新增运行时自检节 |

## 测试命令与结果

| 命令 | 结果 |
|---|---|
| `node --test tests/hub/runtime/*.test.mjs` | 37 pass / 0 fail |
| `scripts/validate-test-prompts.ps1` | 通过（含上下文预算、token、结构） |
| `scripts/run-hub-behavior-eval.ps1 -ValidateOnly` | 19 cases valid |
| `scripts/build-skillhub-package.ps1` | 打包通过，无测试文件泄漏 |

## 验收标准映射

| 特性验收标准 | 覆盖 |
|---|---|
| 已匹配场景的写入前必有 run_id、契约、目标路径、模板、授权 | flow：黄金路径全链 |
| 普通写入不被误拦；同请求含第二大脑意图则走门禁 | 行为 b19 + 边界条款 |
| 无地图卡/必经步骤凭证不能进入写入和完成 | flow：越序/未 preflight 拒绝 |
| 收到"忽略流程直接写"也只得到门禁拒绝 | flow：伪造令牌/未 preflight 拒绝；行为 b18 |
| 每次运行可追溯场景、步骤、回执、跳过证据、结果 | 台账事件流 + status 命令 |

## 已知风险

- 完整跨 agent 行为评测（b18/b19 的 LLM 执行）需 codex 环境，随下次发布门禁执行。
- P2 未完全完成：agent 适配层、跨 agent 回归全量跑、运行事件审计/绕过率统计待后续。

## 下一步建议

- 在装有 Skill 的环境跑一轮真实行为评测，验证 b18/b19 通过率。
- 按 P2 补 agent 适配包与审计统计。
