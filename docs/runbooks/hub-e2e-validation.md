# Hub 端到端验收运行手册

- 适用范围: `second-brain-hub` 的意图识别、场景路由、状态读取、Obsidian/Markdown 写入与降级策略
- 当前权威 Skill 源: `skills/second-brain-hub/`
- 安装镜像: `.agents/skills/second-brain-hub/`、`.claude/skills/second-brain-hub/`（仅用于运行时，不是规范源）
- 路由契约: `skills/second-brain-hub/route-contracts.json`
- 能力契约: `skills/second-brain-hub/capability-contracts.json`
- 配置模板: `skills/second-brain-hub/hub-state.example.json`
- 本地运行态状态: 安装后的对应 Skill 目录旁 `hub-state.json`

---

## 1. 每次修改 Hub 后必须做的检查

### 1.1 自动契约校验

在仓库根目录执行:

```powershell
.\scripts\validate-test-prompts.ps1
```

通过标准:

- JSON 可解析。
- 每条用例包含 `id`、`scene`、`input`。
- 每条用例包含 `expected_intent` 或 `expected_behavior`。
- `id` 无重复。
- 覆盖灵感速记、保存外源、提炼加工、创作启动、收件箱处理、回顾整理、探索查询、不确定、不应触发。
- `route-contracts.json` 中的场景、必选步骤和条件步骤结构合法。
- `capability-contracts.json` 中每个路由能力均声明输入、输出、门控、失败策略与副作用；声明的 HARD-GATE 必须存在于对应 Skill。
- 路由测试夹具与路由契约完全一致；端到端验收夹具符合目标场景、最终动作和前置证据要求。
- 有安装镜像时，显式传入 `-MirrorPath` 检查测试提示是否同步；镜像不同步不改变顶层 `skills/` 的规范源地位。

### 1.2 测试分层

| 层级 | 文件 | 验证目标 |
|---|---|---|
| 意图路由 | `tests/hub/intent-routing.json` | 输入是否映射到正确意图，或正确判定为不触发/不确定 |
| 路由契约 | `tests/hub/route-contract-cases.json` | 每条执行流的必选和条件步骤是否与 `route-contracts.json` 一致 |
| 端到端验收 | `tests/hub/e2e-cases.json` | 场景、最终副作用、前置证据和关键条件分支是否具备可人工验收的断言 |
| 行为评测 | `tests/hub/behavior-cases.json` | 真实 Agent 在独立会话中的路由、流程、产物、安全和 Trace 质量 |

端到端夹具用于人工 dry-run 或真实 Vault 验收。行为评测通过 `HUB_EVAL_MODE` 启动无副作用独立会话，执行真实 Agent 判断，但禁止访问真实 Vault。

### 1.3 行为评测与发布门禁

先验证评测套件：

```powershell
.\scripts\run-hub-behavior-eval.ps1 -ValidateOnly
```

运行默认评测，每条案例独立运行 3 次：

```powershell
.\scripts\run-hub-behavior-eval.ps1
```

快速调试单条案例：

```powershell
.\scripts\run-hub-behavior-eval.ps1 -Runs 1 -CaseId b07 -RunTimeoutSeconds 120
```

报告写入 `artifacts/hub-eval/latest.json`，不提交版本库。发布必须同时满足：综合分不低于 4.6、单次通过率不低于 90%、连续成功率不低于 85%、安全和失败案例 100% 通过。Agent 超时、Schema 不合法和缺少 Trace 均按失败计分，不允许人工补写成功结果。

### 1.4 状态文件检查

确认 `skills/second-brain-hub/hub-state.example.json` 存在，并包含:

- `version`
- `active_projects`
- `last_operations`
- `preferences.storage_mode`
- `preferences.workspace_path` / `preferences.workspace_name`
- `preferences.vault_path` / `preferences.vault_name`（Obsidian 兼容字段）
- `preferences.default_distill_level`
- `preferences.inbox_warning_threshold`
- `twelve_problems`

模板中的 `storage_mode`、`workspace_path`、`workspace_name`、`vault_path` 和 `vault_name` 应为 `null`。真实 `hub-state.json` 可在安装目录旁本地存在，但不应提交到版本库。

如果运行时缺失有效的存储模式和绝对工作区路径，Hub 必须先进入 onboarding，不应继续写入；Markdown 模式不要求 `.obsidian/`。

---

## 2. 人工端到端验收场景

人工验收不要求一次性真实写入所有笔记；可以先做 dry-run，确认 Hub 的决策、路径和反馈格式正确。

### 场景 A: 灵感速记

输入:

```text
记一下，刚想到可以用 AI 自动生成视频分镜脚本
```

预期:

- 识别为 `灵感速记`。
- 使用 active_projects 提示归属，优先推断为 `AI视频创作`。
- 不强制调用 `capture-criteria`。
- 输出应包含目标路径、标题、frontmatter 核心字段和下一步反馈。

### 场景 B: 保存外源

输入:

```text
保存这篇文章 https://example.com/blog/second-brain-tips
```

预期:

- 识别为 `保存外源`。
- 调度链包含 `defuddle -> capture-criteria -> para-system -> progressive-summarization -> obsidian-markdown -> obsidian-cli`。
- 如果 defuddle 不可用，应要求用户粘贴正文，而不是中断。
- 输出应说明保存位置、摘录比例、`distill_level`。

### 场景 C: 提炼加工

输入:

```text
给这篇笔记画一下重点，加粗关键句
```

预期:

- 识别为 `提炼加工`。
- 默认执行 L1+L2，或根据用户指定层级执行。
- 更新 `status` 与 `distill_level`。
- 不应把没有 URL 的“总结”误判为保存外源。

### 场景 D: 创作启动

输入:

```text
帮我做一个关于第二大脑的分享 PPT 大纲
```

预期:

- 识别为 `创作启动`。
- 调度链包含素材检索、条件 L2 提炼、创作阶段诊断、思想群岛/海明威之桥和模板渲染。
- 只有用户明确表达持续收集、方向过多、无法收束等信号时，才额外调用 `diverge-converge`。
- 输出至少包含素材清单、大纲、草稿/下一步行动的写入计划。

### 场景 E: 收件箱处理

输入:

```text
帮我清理一下收件箱
```

预期:

- 识别为 `收件箱处理`，不是 `回顾整理`。
- 先列出收件箱概览。
- 超过阈值时建议批量模式。
- 批量移动或删除前必须展示 preview 并等待确认。

### 场景 F: 回顾整理

输入:

```text
回顾一下这周做了什么
```

预期:

- 识别为 `回顾整理`。
- 仅读取并报告收件箱数量，不直接处理收件箱。
- 输出结构包含本周核心、收件箱、活跃项目、需要关注。

### 场景 G: 探索查询

输入:

```text
找一下关于 AI 视频创作的笔记
```

预期:

- 识别为 `探索查询`。
- 使用 Obsidian 搜索。
- 如果 `twelve_problems` 已配置，应尝试匹配相关问题编号。

### 场景 H: 不应触发 Hub

输入:

```text
今天天气怎么样
```

预期:

- 不触发 Hub。
- 不读写 Vault。
- 直接回答或调用天气能力。

---

## 3. 通过标准

一次 Hub 版本可以标记为通过验收，当且仅当:

1. `.\scripts\validate-test-prompts.ps1` 通过。
2. `route-contracts.json`、`capability-contracts.json`、Hub 场景正文和三层测试夹具通过自动校验。
3. 安装包只提交 `skills/second-brain-hub/hub-state.example.json`，真实 `hub-state.json` 被 `.gitignore` 忽略。
4. 上述 8 个场景的意图识别和调度链人工复核通过。
5. 所有批量写入/移动/删除都具备 preview/confirm/report 的安全边界。
6. `run-hub-behavior-eval.ps1` 的质量门禁通过，且报告中的安全通过率为 100%。

---

## 4. 记录验收结果

每次版本完成后，在 `docs/superpowers/reports/` 下新增验收报告，建议命名:

```text
YYYY-MM-DD-second-brain-hub-vX.Y-acceptance.md
```

报告至少包含:

- 版本范围。
- 涉及文件。
- 测试命令与结果。
- 人工验收场景。
- 已知风险。
- 下一步建议。
