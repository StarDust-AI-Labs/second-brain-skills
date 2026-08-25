# 第二大脑 Skill 适配 DeepSeek Harness 可行性报告

## 1. 执行摘要

结论：第二大脑工作流适合改造成 DeepSeek Harness 插件，整体可行性为“高”，但推荐采用“保留核心运行时，新增 Harness 适配层”的方式，不建议重写现有 Skill。

这套系统的核心价值不在某个 Agent 平台的调用语法，而在以下几项可迁移资产：

- 八类稳定工作场景：灵感速记、保存外源、提炼加工、创作启动、收件箱处理、回顾整理、探索查询、系统诊断。
- 路由和能力契约：`route-contracts.json`、`capability-contracts.json`。
- 运行时状态机和 Hub Run Ledger。
- 写入前置检查、授权令牌、写入回执和失败关闭规则。
- Obsidian Vault / 普通 Markdown 文件夹作为本地事实源。

因此，插件化的本质不是迁移方法论，而是将现有的入口、工具调用、状态持久化、审批和文件系统能力接入 Harness。

## 2. 当前系统适配基础

现有项目已经具备较成熟的插件化基础：

| 能力 | 当前实现 | 对插件化的意义 |
|---|---|---|
| 统一入口 | `second-brain-hub/SKILL.md` | 可映射为一个主 Agent / 插件入口 |
| 意图路由 | `route-contracts.json` | 可映射为工具参数或场景路由器 |
| 能力声明 | `capability-contracts.json` | 可映射为 Harness 工具、依赖和 fallback |
| 状态管理 | `hub-runtime.mjs`、`hub-runs/*.json` | 可作为跨轮次执行状态和恢复依据 |
| 写入安全 | `preflight`、`write_token`、`commit` | 可接入 Harness 审批与高风险操作确认 |
| 本地存储 | Obsidian / Markdown | 适合作为插件外部事实源，避免平台锁定 |
| 降级策略 | `dependencies.json` 和 dependency resolution | 可适配 Harness 工具不可用场景 |
| 验证体系 | `tests/hub` 下的行为、门禁、运行时测试 | 可复用为插件验收基线 |

项目规模上，`skills/second-brain-hub` 当前约 42 个文件、约 2000 行；相关测试约 3000 行。这意味着它已经是一个工作流运行时，而不是几段需要重新包装的提示词。

## 3. 推荐目标架构

推荐采用以下分层：

```text
DeepSeek Harness
  |
  +-- second-brain-harness-plugin
  |     +-- 插件清单与生命周期
  |     +-- 意图入口 / 工具注册
  |     +-- 用户确认与审批适配
  |     +-- 配置目录与 state-dir 适配
  |     +-- 进度卡片 / 完成卡片展示
  |
  +-- second-brain core
  |     +-- SKILL.md
  |     +-- route-contracts.json
  |     +-- capability-contracts.json
  |     +-- workflows / methodology references
  |     +-- hub-runtime.mjs
  |
  +-- Local knowledge source
        +-- Obsidian Vault
        +-- 普通 Markdown 工作区
```

核心原则：

1. Markdown / Vault 仍然是知识事实源。
2. Harness 负责模型调度、工具调用、会话上下文和用户交互。
3. Hub Runtime 继续负责场景契约、状态流转和写入门禁。
4. Harness 插件只负责平台适配，不复制一套新的业务规则。

## 4. 需要适配的关键部分

### 4.1 插件入口与生命周期

需要新增 Harness 插件包及其清单，至少包含：

- 插件名称、版本和兼容的 Harness 版本。
- 启用、停用、初始化和升级钩子。
- 工具注册入口。
- 配置目录、运行时状态目录和日志目录。
- 依赖检查及不可用时的降级提示。

这部分是平台专属代码，现有 Skill 无法直接替代。

### 4.2 工具调用映射

现有 Hub Runtime 的命令序列应被封装成 Harness 工具或内部服务接口：

```text
start -> route -> step* -> preflight -> commit -> finish
```

建议第一版提供以下较粗粒度的工具：

- `second_brain_route`
- `second_brain_execute_step`
- `second_brain_preflight_write`
- `second_brain_commit_write`
- `second_brain_finish`
- `second_brain_status`

不建议一开始把每个方法论模块都暴露为独立用户工具，否则会破坏“第二大脑唯一入口”的设计。

### 4.3 状态和跨会话恢复

Harness 插件需要把以下状态与现有 Ledger 对齐：

- 当前 `run_id`。
- 场景和已加载契约。
- 已完成、已跳过的步骤及证据。
- 当前写入门禁状态。
- `pending_request` 和 onboarding 状态。
- 工具依赖的 primary / fallback / blocked 结果。

如果 Harness 自带持久化存储稳定，可以将会话索引放入 Harness；但建议保留 Hub Run Ledger 作为可审计事实，以便脱离 Harness 诊断和恢复。

### 4.4 文件权限和写入审批

这是最重要的适配点。现有规则要求：

- 未确认存储路径时不得读写 Vault。
- 写入前必须完成 target path、模板、授权和场景输出检查。
- 只能使用有效 `write_token` 执行提交。
- 删除和移动需要目标确认。
- 回执必须证明目标文件真实存在，不能只由模型声称成功。

Harness 的用户确认、审批或高风险工具机制必须映射到这些规则。若 Harness 无法提供可靠的本地文件权限隔离或审批回调，插件只能先支持只读查询和建议生成，不能安全开放写入。

### 4.5 外部工具和依赖适配

现有依赖包括：

- `defuddle`：网页正文提取。
- `obsidian-cli`：Vault 查询和写入。
- `obsidian-markdown`：模板、frontmatter、wikilink 和 callout 检查。
- `obsidian-bases`、`json-canvas`：结构化视图和 Canvas 能力。

适配方式建议按优先级处理：

1. 优先使用 Harness 原生工具或 MCP。
2. 没有原生工具时调用现有 Node CLI / 本地脚本。
3. 最后使用项目中已有的安全 fallback。

依赖不可用时必须记录为 primary、fallback 或 blocked，不能静默跳过。

### 4.6 Onboarding 和配置

现有 `SETUP.md` 负责首次初始化、存储模式选择、PARA 目录创建和 `hub-state.json` 写入。迁移时应把它接入插件首次启用或首次发现配置缺失的生命周期：

- 插件安装不等于知识库初始化。
- 初始化前不得猜测 Vault 或工作区路径。
- 用户确认后才创建目录和配置。
- 初始化失败时保留待处理请求，不能伪造成功。

这部分可以复用现有 SOP，主要新增 Harness 配置读取和交互确认适配。

## 5. 可行性分析

### 5.1 技术可行性：高

工作流具有清晰输入、输出、步骤顺序和副作用边界，适合映射到 Harness 的 Agent、Tool、Memory 和 Sandbox 组件。现有 Node 运行时也是零依赖、命令边界清楚，便于先以 headless 方式接入。

### 5.2 业务可行性：高

第二大脑的核心场景与 Harness 的 Agent 调度模型匹配，尤其是：

- 多步任务执行。
- 工具调用前后状态保存。
- 高风险写入前审批。
- 定时回顾和主动任务。
- 跨会话恢复。

最适合首先落地的是“记录、保存、查询、提炼、诊断”五类高频场景。

### 5.3 数据可行性：高

继续使用本地 Markdown / Obsidian 可以避免把知识库绑定到 Harness 的私有 Memory 或云端数据库。Harness 只作为执行层和交互层，数据迁移和退出成本较低。

### 5.4 平台风险：中高

根据目前掌握的 DeepSeek Harness 资料，其插件体系仍处于 Developer Preview 阶段，可能存在：

- 插件 API 和生命周期变化。
- 工具注册接口变化。
- 权限、审批和本地文件访问行为尚未完全稳定。
- 第三方插件质量和版本兼容性不一致。

因此，适配项目本身可行，但不宜一开始把核心逻辑深度耦合到 Harness 私有 API。

## 6. 工作量评估

以下估算以复用现有运行时为前提，不包含 Harness 本身学习成本和未知 API 返工。

| 阶段 | 目标 | 预估工作量 | 产出 |
|---|---|---:|---|
| MVP | headless、只支持主要场景和 Markdown 工作区 | 5～10 人日 | 可安装插件、工具入口、状态恢复、基础写入门禁 |
| 可日常使用版 | 加入 Obsidian、onboarding、依赖降级、审批和完整测试 | 15～30 人日 | 可稳定运行的本地知识工作流插件 |
| 深度原生化 | 自定义 UI、进度流、定时回顾、原生记忆和更多数据源 | 30～60 人日 | Harness 原生体验和扩展生态 |

按代码量估算：

- MVP：新增或修改约 500～1200 行。
- 正式版本：新增或修改约 1500～3000 行。
- 深度原生化：可能超过 3000 行，主要增加 UI、事件和平台服务代码。

这些工作量不包括重写现有方法论文档，因为方法论和工作流 references 应继续作为核心资产复用。

## 7. 适配优先级

### 第一阶段：验证 Harness 能力

只做最小插件壳和三个工具：

- 路由。
- 查询。
- 只读状态。

先验证插件生命周期、工具注册、状态持久化和本地路径访问。

### 第二阶段：接入安全写入

加入：

- Markdown 工作区。
- `preflight` / `commit` 双阶段写入。
- 用户确认和删除二次确认。
- 真实文件回执。
- onboarding。

通过后再开放灵感速记、外部保存和提炼回写。

### 第三阶段：完善场景和体验

加入：

- Obsidian 专属能力。
- 收件箱批处理。
- 周期回顾和定时触发。
- 进度地图卡和完成卡。
- 更丰富的搜索、Canvas 和 Bases 能力。

### 第四阶段：评估 Harness 原生记忆

只有在本地 Markdown 方案稳定后，才评估是否接入 Harness Memory、OpenViking 或其他向量/语义检索组件。它们应当作为索引或召回层，而不是替代 Vault 的事实源。

## 8. 主要风险与控制措施

| 风险 | 影响 | 控制措施 |
|---|---|---|
| Harness API breaking change | 插件需要返工 | 锁定版本，核心逻辑保持平台无关 |
| 文件权限模型不成熟 | 误写、越界写入 | 延续现有 hard gate，首版优先只读 |
| 插件重复实现业务规则 | 行为漂移、维护成本上升 | 以 contracts 和 hub-runtime 为唯一规范 |
| Harness 状态与 Ledger 不一致 | 无法恢复或审计 | Ledger 保留为执行事实源，Harness 只存索引 |
| 外部工具不可用 | 场景中断 | 显式 primary / fallback / blocked |
| 过早接入原生 Memory | 数据同步和迁移复杂 | 先保持 Markdown / Vault 单一事实源 |
| UI 投入过早 | 开发量膨胀 | 先做 headless，再做 UI |

## 9. 验收标准

插件达到正式可用前，至少应验证：

1. 八类场景可以正确路由，无法判断时只追问一个问题。
2. 所有写入操作都经过 `preflight -> commit`。
3. 未确认路径、无令牌、目标越界和删除未确认时均 fail closed。
4. 工具不可用时记录降级或阻塞，不静默跳过。
5. 中断后可以使用 `run_id` 恢复状态。
6. 插件声称完成前，目标文件和写入回执真实存在。
7. 现有 `tests/hub` 行为和门禁测试可以复用，新增 Harness 端到端测试覆盖工具映射。
8. 卸载 Harness 插件后，Markdown / Vault 数据仍可独立使用。

## 10. 最终建议

建议立项，但将项目定义为：

> “第二大脑核心运行时的 DeepSeek Harness 适配插件”

而不是：

> “把第二大脑 Skill 全部重写成 Harness 原生应用”。

最稳妥的技术路线是：先做 headless MVP，优先验证 Harness 的插件 API、工具权限和持久化能力；保持现有 `SKILL.md`、契约、references、Hub Runtime 和本地存储不变；等平台 API 稳定后，再逐步增加 Obsidian、定时回顾、UI 和原生记忆能力。

总体判断：工作流适合插件化，核心改动量可控，业务复用率高；真正的不确定性来自 DeepSeek Harness 的平台成熟度，而不是第二大脑本身的架构。
