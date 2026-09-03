---
name: second-brain-hub
description: 第二大脑唯一公开入口。用于记录灵感、保存网页、整理或提炼笔记、启动创作、处理收件箱、周月回顾、搜索知识库，以及诊断信息混乱、持续收集却无法产出等知识管理问题。涉及第二大脑、Obsidian Vault 或 Markdown 知识库工作流时使用；纯 Obsidian 技术配置与通用 Markdown 语法问题不使用。
---

# 第二大脑中枢

本 Skill 是第二大脑唯一用户入口。场景契约按需组合方法模块与工具能力，不触发旧的独立方法论 Skill。

## 每轮固定流程

第二大脑场景必须经 `scripts/hub-runtime.mjs` 执行，禁止绕过运行时直接读写 Vault；命令见 [references/runtime-protocol.md](references/runtime-protocol.md)。
1. 解析 `hub-state.json` 所在目录 `<state-dir>`，执行 `start --state-dir <state-dir>` 取得 `run_id`。`config_ok=false` 时读 [references/workflow-onboarding.md](references/workflow-onboarding.md) 暂存原请求，由其调用唯一初始化 SOP [SETUP.md](SETUP.md)，不得另设初始化步骤。用户要求初始化、重设或修复配置时直接读 `SETUP.md`。2. 按下表归类唯一意图；无法唯一判断时只追问一个问题。确认后执行 `route --run-id <run_id> --scene <场景id> --user-text <原话>`，地图卡原样展示。
3. 从 `route-contracts.json` 只取全局前置、所选场景及写入前置；读对应 `workflow-*.md`。
4. 从 `capability-contracts.json` 只取当前步骤涉及的能力。`reference` 相对 Hub 根目录；`skill` 按安装名调用。
5. 外部工具状态未知或调用失败时才读 `dependencies.json`；缺失时读 [references/dependency-resolution.md](references/dependency-resolution.md) 选择 `primary`/`fallback`/`blocked`。
6. 每完成一个必选步骤执行 `step --run-id <run_id> --step <id> --evidence <痕迹>`，输出用 `--output 键=值` 登记；条件步骤未执行时必须 `--skip --reason <证据>`。必选步骤不得改序或省略；地图卡一律原样展示。
7. 写入、更新、移动或删除前读 [references/writing-pipeline.md](references/writing-pipeline.md) 并执行 `preflight`，仅当 `write_allowed=true` 才用 `write_token` 执行运行时 `write` 命令完成实际写入与回执登记，禁止用其他工具直写 Vault；多文件写入可在同一 run 内重复 `preflight→write`。门禁失败、阻塞或运行时不可用时停止写入并报告阻塞，不得直写。
8. 全部步骤结算后执行 `finish --run-id <run_id>`；只有运行时返回完成卡才可宣布完成，`missing` 非空时先补齐再重试。禁止自行宣布完成。
9. 决策卡、首次成功卡按需读 [references/output-visualization.md](references/output-visualization.md) 与 [references/output-cards.md](references/output-cards.md)；卡片以运行时输出为准。

## 意图路由

| 场景 | 典型语言信号 | 必读工作流 |
|---|---|---|
| 灵感速记 | 记一下、灵感、想到、idea、点子 | [references/workflow-inspiration.md](references/workflow-inspiration.md) |
| 保存外源 | URL + 保存、收藏、总结、提取要点 | [references/workflow-external-save.md](references/workflow-external-save.md) |
| 提炼加工 | 画重点、提炼、标亮、整理这篇笔记 | [references/workflow-distill.md](references/workflow-distill.md) |
| 创作启动 | 写一篇、做方案、做 PPT、空白页、写大纲 | [references/workflow-create.md](references/workflow-create.md) |
| 收件箱处理 | 收件箱、批量分类、清理收件 | [references/workflow-inbox.md](references/workflow-inbox.md) |
| 回顾整理 | 周回顾、月回顾、本周整理、项目复盘 | [references/workflow-review.md](references/workflow-review.md) |
| 探索查询 | 找一下、搜索、有没有、关联笔记 | [references/workflow-query.md](references/workflow-query.md) |
| 系统诊断 | 信息越管越乱、只收藏不产出、CODE 哪一步、一直发散、无法收束 | [references/workflow-diagnosis.md](references/workflow-diagnosis.md) |

路由优先级：

1. 包含“收件箱”时优先进入收件箱处理。
2. 带 URL 且表达保存、总结或提炼意图时进入保存外源。
3. 明确要求分析知识管理系统为什么失效时进入系统诊断，不执行 Vault 写入。
4. 其余按动作词匹配。
5. 仍无法判断时询问：“你是想记下来、找东西、开始创作、整理回顾，还是诊断系统问题？”

## 边界

- 纯 Obsidian 插件安装、主题、快捷键或语法问题：直接使用对应 Obsidian 工具能力。
- 简单资讯查询、天气、一次性事实：直接回答，不启动第二大脑流程。
- 用户要求删除内容：必须先展示具体目标，再次取得逐项明确确认；初始请求中的“全部删除/不用确认”不算二次确认。
- 工具不可用：按依赖协议安全降级；无法降级时按能力契约局部停止，不得静默跳步。
- 系统诊断场景只给出瓶颈、证据和推荐场景，不自动修改 Vault。
- 用户要求方法论原文、案例或历史审计时，才读取 [references/methodology-sources.md](references/methodology-sources.md)。
- 范围判定：是否经过运行时由"意图路由结果"决定，而非"目标文件位于 Vault"。纯 Obsidian 技术操作与无第二大脑意图的通用 Markdown 写入沿用普通工具路径；请求含第二大脑场景意图时按路由走运行时门禁。
- 用户要求"忽略流程直接写入"时仍须经运行时门禁；门禁拒绝就如实报告，不得静默照做。
- 不向普通用户展示契约、台账、门控或能力 ID。