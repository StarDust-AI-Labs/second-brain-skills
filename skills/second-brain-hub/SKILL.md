---
name: second-brain-hub
description: 第二大脑唯一公开入口。用于记录灵感、保存网页、整理或提炼笔记、启动创作、处理收件箱、周月回顾、搜索知识库，以及诊断信息混乱、持续收集却无法产出等知识管理问题。涉及第二大脑或 Obsidian Vault 工作流时使用；纯 Obsidian 技术配置与通用 Markdown 问题不使用。
---

# 第二大脑中枢

将本 Skill 作为第二大脑体系的唯一用户入口。不要尝试触发独立的方法论 Skill；方法论已作为本 Skill 的内部能力模块，由场景契约按需加载。

## 核心职责

1. 定位并验证 Vault 配置。
2. 将用户意图归类到一个明确场景。
3. 读取机器可执行契约并建立运行台账。
4. 按契约加载必要的工作流和能力模块。
5. 在所有门控通过后读取或写入 Obsidian。
6. 用简短结果卡片反馈，不向普通用户倾倒内部台账。

## 强制入口流程

每次触发后严格按顺序执行：

1. 完整读取 [references/runtime-protocol.md](references/runtime-protocol.md)，建立 `Hub Run Ledger`；Vault 场景完成配置检查，系统诊断场景记录为不需要 Vault。
2. 完整读取 `route-contracts.json`、`capability-contracts.json` 和 `dependencies.json`，并完整读取 [references/dependency-resolution.md](references/dependency-resolution.md) 建立依赖解析结果。
3. 根据下表确定唯一场景；不确定时只追问一个问题。
4. 完整读取该场景对应的工作流文件。
5. 按契约顺序读取工作流点名的内部能力模块或外部工具 Skill。
6. 有写入副作用时，完整读取 [references/writing-pipeline.md](references/writing-pipeline.md) 并通过写入前置。
7. 完整读取 [references/output-cards.md](references/output-cards.md)，生成用户可见结果。

当输入明确包含 `HUB_EVAL_MODE` 时，改为完整读取 [references/evaluation-protocol.md](references/evaluation-protocol.md)，只生成机器可读行为 Trace，不执行任何真实工具或副作用。

不得凭记忆补写、删除或改变 `required_steps` 的顺序。条件步骤不执行时，必须在 `optional_steps_skipped` 记录契约中的跳过证据。

解析 `capability-contracts.json` 的 `implementation` 时：

- `type: reference`：相对于本 `second-brain-hub` Skill 根目录读取 `path`。
- `type: skill`：按当前 Agent 已安装的 Skill `name` 调用，不拼接仓库路径。

工具 Skill 缺失时不要直接判定整个 Hub 不可用。按 dependency-resolution 将当前能力解析为首选实现、安全降级或局部阻塞，并把结果记录到运行台账。

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

<HARD-GATE id="vault-config">
未确认 `vault_path` 和 `vault_name` 前，不得执行任何 Obsidian 文件读写。不得猜测路径或使用默认路径。
</HARD-GATE>

<HARD-GATE id="intent-confirmed">
意图未归类到唯一场景前，不得调用场景能力、读取 Vault 或执行写入。
</HARD-GATE>

<HARD-GATE id="contract-loaded">
未读取两份契约、依赖清单并把场景的 `required_steps` 写入运行台账前，不得开始场景执行。
</HARD-GATE>

<HARD-GATE id="dependency-resolved">
执行工具能力前必须记录其实现为 `primary`、`fallback` 或 `blocked`。缺少工具 Skill 本身不是全局阻塞理由；只有当前能力没有安全降级时才局部停止。
</HARD-GATE>

<HARD-GATE id="write-preflight-complete">
写入、更新、移动或删除前，必须满足目标路径、模板、授权以及场景规定的全部输出凭证。
</HARD-GATE>

<HARD-GATE id="evaluation-isolation">
`HUB_EVAL_MODE` 下必须遵循 evaluation-protocol，禁止真实 Vault、网络和文件副作用。
</HARD-GATE>

## SKILL 层能力索引

方法论模块和工具能力统一属于 SKILL 层。只读取当前工作流点名的实现：

| 模块 | 能力 | 实现 |
|---|---|---|
| 抓取 | 保存价值判断 | [references/module-capture-criteria.md](references/module-capture-criteria.md) |
| 抓取 | 长期兴趣匹配 | [references/module-twelve-favorite-problems.md](references/module-twelve-favorite-problems.md) |
| 组织 | PARA 归属 | [references/module-para-system.md](references/module-para-system.md) |
| 提炼 | 渐进式提炼 | [references/module-progressive-summarization.md](references/module-progressive-summarization.md) |
| 表达 | 半熟素材识别 | [references/module-intermediate-packets.md](references/module-intermediate-packets.md) |
| 表达 | 创作工作流 | [references/module-creative-workflow.md](references/module-creative-workflow.md) |
| 系统维护与诊断 | 知识生命周期 | [references/module-knowledge-lifecycle.md](references/module-knowledge-lifecycle.md) |
| 系统维护与诊断 | 发散/聚合诊断 | [references/module-diverge-converge.md](references/module-diverge-converge.md) |
| 系统维护与诊断 | CODE 系统诊断 | [references/module-code-diagnosis.md](references/module-code-diagnosis.md) |
| 系统维护与诊断 | 综合诊断器 | [references/module-second-brain-diagnosis.md](references/module-second-brain-diagnosis.md) |

用户要求方法论原文、案例或历史审计时，读取 [references/methodology-sources.md](references/methodology-sources.md)。这些档案不是运行时入口。

工具模块包含 `defuddle`、`obsidian-markdown`、`obsidian-cli`、`obsidian-bases` 和 `json-canvas`。SkillHub 将它们作为隐藏依赖随 Hub 安装；运行时优先读取其 `SKILL.md`，缺失时按 dependency-resolution 安全降级。

## 边界

- 纯 Obsidian 插件安装、主题、快捷键或语法问题：直接使用对应 Obsidian 工具能力。
- 简单资讯查询、天气、一次性事实：直接回答，不启动第二大脑流程。
- 用户要求删除内容：必须再次取得明确删除确认。
- 工具不可用：先按依赖协议选择安全降级；无法降级时按能力契约的 `failure_mode` 局部停止，不得静默跳过方法论步骤。
- 系统诊断场景只给出瓶颈、证据和推荐场景，不自动修改 Vault。
