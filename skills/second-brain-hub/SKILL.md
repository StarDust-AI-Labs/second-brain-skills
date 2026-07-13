---
name: second-brain-hub
description: |
  第二大脑唯一入口。触发:记录、保存、整理、提炼、回顾、查询、创作。
  不适用:纯Obsidian技术问题。
tags: [中枢调度, 知识管理, 工作流编排, 第二大脑, CODE]
related_skills: [second-brain-code, capture-criteria, twelve-favorite-problems, para-system, progressive-summarization, creative-workflow, diverge-converge, intermediate-packets, knowledge-lifecycle, obsidian-cli, obsidian-markdown, obsidian-bases, json-canvas, defuddle]
priority: highest
---

# 第二大脑中枢调度 (Second Brain Hub)

## 职责定义

Hub 是第二大脑系统的**唯一入口**，负责三件事：

1. **意图识别** — 判断用户当前想完成什么操作
2. **链式调度** — 按预设的场景流程，依次调用方法论 skill 获取认知结果
3. **统一写入** — 将所有产出按统一模板写入 Obsidian vault

**Hub 不负责**（交给子 skill）：
- 判断一条信息值不值得记 → `capture-criteria`
- 确定信息归入哪个文件夹 → `para-system`
- 如何提炼笔记中的要点 → `progressive-summarization`
- 如何组织创作流程 → `creative-workflow`
- Markdown 格式规范细节 → `obsidian-markdown`

**Hub 的独特价值**：记住上下文（hub-state.json）、编排多 skill 协作、确保写入格式一致。

---

## 强制运行协议（最先加载）

Hub 不是建议清单，而是**执行状态机**。每次激活后，必须在内部维护一份 `Hub Run Ledger`，并用它决定是否允许进入下一步。不得用"我理解了流程"、"我会参考某 skill"、"这次很简单"代替状态更新。

### 0.1 Hub Run Ledger

每次处理第二大脑任务时，先建立并持续更新以下台账：

```yaml
hub_run_ledger:
  vault_config: unchecked | pass | blocked
  intent: unclassified | 场景1-灵感速记 | 场景2-保存外源 | 场景3-提炼加工 | 场景4-创作启动 | 场景5A-收件箱处理 | 场景5-回顾整理 | 场景6-探索查询
  scenario_contract: null
  capability_contract_version: null
  global_preflight: []
  write_preflight: []
  required_chain: []
  completed_steps: []
  optional_steps_skipped: []
  child_skill_outputs: {}
  target_path: null
  template_ready: false
  write_allowed: false
  blocked_reason: null
```

### 0.2 执行锁

在任何 Obsidian 读写、文件写入、移动、删除、追加之前，必须同时满足：

1. `vault_config = pass`
2. `intent` 已归类到明确场景
3. 全局 `global_preflight`、适用的 `write_preflight` 与 `required_chain` 已按顺序执行到当前步骤
4. 每个必选子 skill 都有可检查的输出记录，写入到 `child_skill_outputs`
5. 写入、更新或移动时目标路径已确定，且 `target_path != null`；删除时已取得用户的明确删除确认
6. 标准模板已渲染，或当前场景明确不是写入场景
7. `write_allowed = true`

禁止行为：
- 直接使用 `obsidian-cli` 或 Write 工具写入 Vault
- 用 Hub 自己的判断替代必选子 skill
- 跳过 `required_chain` 中的必选步骤
- 在缺少子 skill 输出字段时继续下一步
- 因为用户说"随便放/快速存/先写进去"而绕过分类、模板或提炼

### 0.3 子 Skill 能力契约与输出凭证

`capability-contracts.json` 是 Hub 子 Skill 的能力规范源，定义每项能力的 `inputs`、`outputs`、`gates`、`failure_mode` 与 `side_effects`。调用链中的每个必选子 skill 必须按该契约产出结构化结果，供 Hub 进入下一步时检查：

| 子 skill | 必须输出 |
|---|---|
| `defuddle` | `source_title`, `raw_markdown`, `source_word_count` |
| `capture-criteria` | `keep_decision`, `resonance_reason`, `criteria_hits` |
| `para-system` | `target_folder`, `classification_reason`, `project_or_area` |
| `progressive-summarization` | `distill_level`, `distilled_excerpt`, `core_points` |
| `obsidian-markdown` | `final_markdown`, `frontmatter_fields`, `wikilinks_or_callouts_checked` |
| `intermediate-packets` | `matched_notes`, `usable_packets`, `material_gaps` |
| `diverge-converge` | `mode_diagnosis`, `recommended_mode_switch`, `next_constraint` |
| `creative-workflow` | `outline_or_next_artifact`, `hemingway_bridge`, `next_action` |
| `knowledge-lifecycle` | `review_scope`, `review_findings`, `next_priorities` |
| `twelve-favorite-problems` | `matched_problem_ids`, `match_reason` |
| `obsidian-cli` | `search_results`, `read_content`, `write_receipt` |

如果某个工具不可用，只能记录为 `blocked_reason` 或执行该场景规定的降级方案；降级方案不得跳过前置方法论步骤。

### 0.4 场景调用链契约

`route-contracts.json` 是场景链路的**唯一规范源**；`capability-contracts.json` 是子 Skill 能力的唯一规范源。Hub 在完成意图识别后，必须读取两份文件并写入 Ledger：

1. 读取 `capability-contracts.json` 的版本，写入 `hub_run_ledger.capability_contract_version`；每个路由步骤只能调用已声明的能力。
2. 将 `global_preflight` 写入 `hub_run_ledger.global_preflight`，并先完成 Vault 配置与意图确认。
3. 按场景 `id` 选择一条 `scenes` 契约，写入 `hub_run_ledger.scenario_contract`。
4. 将该契约的 `required_steps` 原样写入 `hub_run_ledger.required_chain`；不得从场景正文或记忆中自行补写、删减或改序。
5. 对 `conditional_steps`，满足 `run_when` 时执行并记录输出；不满足时，将 `id` 和 `skip_evidence` 写入 `optional_steps_skipped`。
6. 对 `mode` 为 `write`、`update`、`move-or-delete` 的场景，完成 `write_preflight` 后才能执行副作用操作。

| 场景 | contract id | 操作模式 |
|---|---|---|
| 场景1 灵感速记 | `inspiration` | write |
| 场景2 保存外源 | `external-save` | write |
| 场景3 提炼加工 | `distill` | update |
| 场景4 创作启动 | `create` | write |
| 场景5A 收件箱处理 | `inbox` | move-or-delete |
| 场景5 回顾整理 | `review` | write |
| 场景6 探索查询 | `query` | read |

### 0.5 用户可见输出层

`Hub Run Ledger` 是内部执行台账，不应原样暴露给普通用户。用户默认看到的是**清晰、短句、可行动**的输出卡片；只有用户要求"查看审计/调试/执行链细节"时，才展示原始字段。

输出原则：
- 先说当前状态，再说做了什么，最后说下一步
- 避免裸露工具日志、命令参数、内部字段名和大段 JSON/YAML
- 每次需要用户决策时，只问一个核心问题，并给出推荐选项
- 路径、文件名、数量、是否写入成功必须明确
- 技术校验要翻译成普通语言，例如"已确认知识库位置"而不是 `vault_config=pass`

运行过程只使用四类用户可见卡片：

```text
【开始】我会按「{场景名}」流程处理
【会做】{3-5 个动作用 → 串联}
【需要你确认】{如果需要用户输入，写清楚问题；否则写"暂时不需要"}
```

```text
【进度】{当前步骤}/{总步骤}：{正在做什么}
【发现】{一句话说明关键发现，可省略}
【下一步】{下一步动作}
```

```text
【需要你决定】{一个明确问题}
【我的建议】{推荐选项 + 一句话理由}
【可选项】{选项 A / 选项 B / 选项 C}
```

```text
【完成】{一句话结果}
【位置】{Vault 内路径或 Obsidian 打开链接}
【核心要点】{1-3 条最重要内容}
【处理摘要】{关键数字：来源、字数、提炼层级、归属}
【下一步】{最自然的后续动作；没有则写"暂无"}
【流程校验】{用普通语言列出关键门控是否完成}
```

---
## 第零步：加载配置并定位 Vault（最先执行）

每次被激活时，Hub 必须先确定 Vault 位置。**不要在 Skill 内硬编码任何真实本地路径**；真实路径只能来自用户配置、环境变量或本地未提交的运行态状态文件。

```
1. 按以下优先级读取配置:
   a. 本轮对话中用户显式提供的 vault_path / vault_name
   b. 当前项目的本地运行态配置: {项目根目录}/.claude/hub-state.json
   c. Skill 安装目录旁的本地运行态配置: {skill目录}/hub-state.json
   d. 环境变量: SECOND_BRAIN_VAULT_PATH / SECOND_BRAIN_VAULT_NAME
   e. Legacy fallback: {项目根目录}/.Codex/hub-state.json

   若多个来源同时存在, 使用优先级最高的来源。

2. 从配置中提取关键变量:
   vault_path = preferences.vault_path
   vault_name = preferences.vault_name
   active_projects = active_projects
   twelve_problems = twelve_problems

3. 若没有任何配置文件 → 参考 hub-state.example.json 创建本地 hub-state.json:
   vault_path: null  (首次使用需引导用户配置)
   vault_name: null
   active_projects: []
   twelve_problems: []

4. 将以上变量加载到当前会话上下文（供后续所有步骤引用）
```

**Vault 路径未配置时的引导流程**：
> 若 vault_path 为 null，询问用户：
> "请告诉我你的 Obsidian Vault 绝对路径和 Vault 名称。"
> 将用户回答写入本地 hub-state.json 的 preferences 中，然后继续。

<HARD-GATE id="vault-config">
在未确认 vault_path 和 vault_name 之前，不得执行任何 Obsidian 文件读写操作。

若配置为 null 或无法加载配置文件：
1. 必须先引导用户提供路径
2. 将配置写入 hub-state.json
3. 重新进入流程从第零步开始

禁止的行为：
- 猜测 Vault 路径
- 使用默认路径（如 ~/Documents/Obsidian）
- 跳过配置检查直接进入意图识别
</HARD-GATE>

**安装包约束**：
- Skill 仓库只应提交 `hub-state.example.json`，不应提交包含真实 `vault_path` 的 `hub-state.json`。
- 文档和示例可以使用 `<你的 Vault 绝对路径>` 这类占位符，不要写入某台机器的真实路径。
- 如果 agent 没有文件写入权限，就在本轮对话中记住配置，并提示用户稍后手动创建本地配置文件。

---

## 第一步：加载 Vault 运行时状态

```
1. 根据 vault_path 拼接 Vault 内的状态文件路径:
   {vault_path}\.obsidian\hub-state.json

2. 读取 Vault 内状态文件（与项目配置合并）
   - 若存在 → 读取 last_operations 等运行时数据
   - 若不存在 → 以项目配置为准，自动创建该文件
```

---

## 第二步：意图识别

根据用户输入中的语言信号，将意图归类到以下 8 种之一：

| # | 意图类别 | 语言信号（关键词/模式） | 下一步 |
|---|---------|----------------------|--------|
| 1 | **灵感速记** | "记一下""灵感""想到""idea""点子""忽然""刚想到" | → 第三步-速记 |
| 2 | **保存外源** | URL/链接 + "保存""收藏""这篇文章""存下来""值得看""总结这篇文章""提取要点""提炼核心""精华" | → 第三步-外源 |
| 3 | **提炼加工** | "画重点""帮我整理这段""标亮""温习""做笔记"（不含外部 URL） | → 第三步-提炼 |
| 4 | **创作启动** | "写一篇""做一个""创作""生成""帮我写""做PPT""写方案""开始写""帮我起头""空白页""不知道怎么开始创作""写个大纲""拟个提纲" | → 第三步-创作 |
| 5 | **收件箱处理** | "清理收件箱""收件箱""处理收件""批量分类""收件箱满了" | → 第三步-收件箱 |
| 6 | **回顾整理** | "回顾""整理""本周""这周""每月""周回顾""月回顾" | → 第三步-回顾 |
| 7 | **探索查询** | "找一下""搜索""有没有""在哪""帮我查""关联" | → 第三步-查询 |
| 8 | **不确定** | 无法匹配以上任何模式 | → 简短追问澄清意图 |

**意图识别优先级**：
- URL 检测优先 → 只要有链接就是"保存外源"
- "收件箱"关键词优先 → 只要说"收件箱"就是"收件箱处理"（非"回顾整理"）
- 明确的动作词（记/写/找/整理）次之
- 模糊输入最后处理 → 归入"不确定"

**边界模糊时的安全网**（防止漏触发）：
- 若用户提供的 URL 内容属于**系统性方法论/框架/工程规范/设计模式/最佳实践/反模式清单**（非简单资讯），即使用户用词是"总结/提取/看看"，也必须认为匹配场景 2「保存外源」→ 按 CODE 流程写入。**追问一句话即可**："要存入第二大脑吗？"——默认答案是"是"。
- 简单资讯型 URL（新闻、天气、一次性事实查询）则不触发 Hub，直接回答。

**追问模板**（仅在"不确定"时使用）：
> "你是想【记下来】/【找东西】/【开始创作】/【整理回顾】？简单说就行。"

<HARD-GATE id="intent-confirmed">
在未明确识别用户意图之前，不得进入场景执行流程。

必须满足以下之一才能通过：
1. 意图归类到 1-7 中的某一类（置信度高）
2. 用户对追问做出明确回答

禁止的行为：
- 猜测用户意图并直接执行
- 同时执行多个场景"以防万一"
- 在"不确定"状态下调用方法论 Skill
- 跳过追问直接默认为某个场景
</HARD-GATE>

---

## 合理化防御（Prebuttal）

Agent 在上下文压力下会为跳过规则找到**听起来合理的理由**。以下预先列出常见借口及反驳：

### 防御场景 1：跳过 capture-criteria

| Agent 的借口 | 预先反驳 |
|-------------|---------|
| "这只是一篇普通文章，直接保存就好，不用走 capture-criteria" | capture-criteria 不是为"特殊文章"设计的，而是为**所有外源输入**设计的标准筛选流程。跳过它 = 退回到数字囤积模式 |
| "用户已经说'保存'了，说明他已经判断过价值" | 用户的"保存"是初步意向，capture-criteria 帮助用户二次确认并避免收藏夹膨胀。你替代用户判断 = 剥夺了用户的策展权利 |
| "我读了文章，我觉得值得记" | 你的判断 ≠ 用户的共鸣。只有 capture-criteria 用四标准系统化筛选才能避免确认偏误 |

### 防御场景 2：跳过 para-system

| Agent 的借口 | 预先反驳 |
|-------------|---------|
| "这篇文章明显是技术类，放'资源/AI前沿'就好，不用走 para-system" | para-system 不是简单的"看标题猜分类"。它需要问"这条信息能帮你推进哪个项目？"——这决定了它从哪个入口被找到 |
| "用户已经有 PARA 目录了，我知道怎么分类" | 理解 ≠ 执行。para-system 提供的是确定性分类逻辑，不是启发式规则。跳过它 = 自以为是地猜测用户的组织意图 |
| "放收件箱就行，用户自己会整理" | 收件箱是暂存区，不是垃圾场。每多一条未分类笔记，收件箱就越接近"再也不看"的临界点 |

### 防御场景 3：跳过 progressive-summarization

| Agent 的借口 | 预先反驳 |
|-------------|---------|
| "文章很短，不需要提炼" | 长度不是提炼的标准——信息密度才是。一段 100 字的高密度洞见比 1000 字的废话更需要提炼 |
| "L1 提炼就够了，不需要写核心要点" | 核心要点是未来回顾时的第一入口。没有它，三个月后的你自己不知道这篇笔记在说什么 |
| "这是小修改，不用走完整流程" | 每条规则都在这类借口中被绕过。没有"小修改"豁免权——要么走流程，要么不写 |

### 防御场景 4：跳过模板

| Agent 的借口 | 预先反驳 |
|-------------|---------|
| "这次情况特殊，模板不适用" | 模板就是为特殊情况写的。常规情况不需要模板——用户自己就能写 |
| "让我先快速写入再补字段" | "快速写"就是"永久丢失"的同义词。frontmatter 字段一旦缺失，后续检索、回顾、整理全部失效 |

---

## 第三步：按场景执行

### 场景 1：灵感速记

```
流程:
1. [Hub target-routing] 快速确认归属并记录 `target_path`:
   "跟哪个项目有关？"
   列出 active_projects 供选择，允许说"都不相关"（则归入资源或收件箱）

2. [Hub] 判断是否需要 capture-criteria:
   灵感自带个人价值（"个性"标准天然满足），通常不需要严格筛选
   但如果用户表示不确定→调用 capture-criteria 做快速共鸣判断；否则将跳过理由写入 `optional_steps_skipped`

3. [Hub] 生成笔记标题:
   格式: "灵感-{关键词}_{YYYY-MM-DD-HHmm}"
   例: "灵感-AI分镜脚本草稿_2026-06-12-1430"

4. [obsidian-markdown] 渲染标准笔记模板:
   必须产出 `final_markdown`、完整 frontmatter 与核心要点，不得由 Hub 直接拼接后跳过模板检查。

5. [obsidian-cli] 写入笔记:
   obsidian vault="{vault_name}" create name="{标题}" content="{模板内容}" folder="{归属文件夹}" silent

   模板内容:
   ---
   source: 语音灵感
   captured: {YYYY-MM-DD HH:mm}
   project: {归属项目名 | "收件箱"}
   status: inbox
   tags: [灵感, {主题关键词}]
   ---

   # {标题}

   {用户原话/整理后的灵感内容}

   > [!abstract] 核心要点
   > {一句话总结}

6. [Hub] 更新 hub-state.json:
   last_operations 开头插入: {action: "capture_inspiration", path: "{folder}/{filename}", time: "{now}"}
   保留最近 20 条

7. [Hub] 按第 5 步标准结果卡片反馈:
   必须包含: 完成状态、Vault 内位置、核心要点、处理摘要、下一步、流程校验
```

### 场景 2：保存外源内容

```
流程:
1. [defuddle] 提取网页正文:
   defuddle parse {url} --md
   将输出保存为临时 Markdown

2. [capture-criteria] 判断是否值得保留:
   将提取的正文前 500 字交给 capture-criteria skill
   用四标准快速过一遍（启发/实用/个性/新奇）
   终极裁决: "读完这段，你有那种眼前一亮的感觉吗？"

   → 不值得保留 → 按第 5 步阻塞/跳过格式反馈，说明不写入的原因和可选下一步
   → 值得保留 → 继续

3. [para-system] 确定归属:
   "这条信息能帮你推进哪个项目？"
   提供 active_projects 列表
   按 P→A→R→A 顺序引导判断

   确定 folder = {归属路径}，如 "📂 项目/AI视频创作"

4. [progressive-summarization] L1 精简:
   对提取的正文执行第 1 层提炼——删减至原文核心段落的 10%
   保留 3-5 个最有价值的段落

5. [obsidian-markdown] + [obsidian-cli] 写入:
   套用统一笔记模板（见第四步），创建笔记到目标文件夹

   额外字段:
   source: {原始URL}
   extracted_by: defuddle
   distill_level: 1

6. [Hub] 更新 hub-state.json + 按第 5 步标准结果卡片反馈:
   必须包含: 保存位置、核心要点、原文字数→摘录字数、提炼层级、归属项目、流程校验
```

### 场景 3：提炼加工

```
流程:
1. [obsidian-cli] 找到目标笔记:
   obsidian vault="{vault_name}" search query="{关键词}" limit=10
   向用户确认要提炼的是哪篇

2. [obsidian-cli] 读取当前内容:
   obsidian vault="{vault_name}" read file="{笔记名}"

3. [progressive-summarization] 逐层提炼:
   问用户: "要做到第几层？"
   - L1 精简摘录（2分钟）
   - L2 加粗要点（5分钟）
   - L3 高亮精华（2分钟）
   - L4 纲要总结（3分钟）
   默认只做 L1+L2

4. [obsidian-cli] 更新笔记:
   用提炼后的内容替换原笔记，保留 frontmatter 中 status 字段更新为 "distilled"

5. [Hub] 按第 5 步标准结果卡片反馈:
   必须包含: 更新位置、提炼层级、字数变化、核心要点、下一次回顾方式、流程校验
```

### 场景 4：创作启动（v1.1）

```
流程:
1. [Hub] 确认创作主题，并检查是否存在发散/聚合阻塞信号:
   "你想创作什么？大概什么方向/主题？"

2. [diverge-converge] 条件诊断:
   仅当用户明确表达“持续收集”“方向太多”“无法收束”“完美主义难以交付”或“项目长期停滞”时调用。
   未检测到这类信号时记录跳过理由；常规创作卡点仍由 `creative-workflow` 的三类诊断处理。

3. [intermediate-packets] 检索已有素材:
   [obsidian-cli] search query="{主题关键词}" vault="{vault_name}"
   [obsidian-cli] search query="{相关概念}" vault="{vault_name}"
   汇总匹配的笔记列表

4. [progressive-summarization] 条件执行 L2:
   任一选中素材的 `distill_level < 2` 时，对最相关素材执行 L2 后再进入思想群岛。
   若所有选中素材已达到 L2，则将“跳过 L2：素材已提炼”与证据写入 `optional_steps_skipped`，不得静默省略。

5. [creative-workflow] 诊断创作阶段并生成中间产物:
   将所有匹配的笔记内容/摘要集中到一处，选择思想群岛、海明威之桥或压缩范围作为主策略。
   必须产出大纲/下一产物与海明威之桥，再进入模板渲染。

6. [obsidian-markdown] 为素材清单、大纲和草稿渲染标准模板，包含海明威之桥，产出各文件的 `final_markdown`。

7. [obsidian-cli] 创建项目文件夹和文件:
   obsidian vault="{vault_name}" create name="{项目名}/01-素材清单" ...
   obsidian vault="{vault_name}" create name="{项目名}/02-大纲" ...
   obsidian vault="{vault_name}" create name="{项目名}/03-草稿" ...

8. [Hub] 更新 active_projects（如果是新项目）+ 按第 5 步标准结果卡片反馈:
   必须包含: 项目位置、素材数量、大纲章节数、海明威之桥、下一步动作、流程校验
```

### 场景 5A：收件箱批量处理（v1.1）

```
流程:
1. [Hub] 检查收件箱状态:
   [obsidian-cli] list folder="📥 收件箱"
   若收件箱为空 → 按第 5 步标准结果卡片反馈"收件箱为空，无需处理" → 结束

   若有内容 → 继续下一步

2. [Hub] 展示收件箱概览:
   列出所有收件箱笔记的标题 + 核心要点 + captured 时间
   按第 5 步过程输出格式报告: 收件箱共 {N} 条，建议逐条快速分类

   若 N > inbox_warning_threshold (默认 15):
   "⚠ 收件箱积压 {N} 条（超过阈值 {threshold}），建议尽快处理"

3. [Hub] 逐条引导分类:
   对每一条收件箱笔记:
   a. 展示: 标题 + 核心要点 + captured 时间
   b. 快速分类选项:
      - 📂 项目: {列出 active_projects}
      - 🏛 领域: 归入某个长期责任领域
      - 📚 资源: 感兴趣但暂无明确用途
      - 🗑 删除: 不再需要

   c. 用户选择后:
      - 项目/领域/资源 → [para-system] 确认目标文件夹 → obsidian-cli move
      - 删除 → obsidian-cli 移到 .trash
      - 更新 frontmatter: status: inbox → processed

4. [Hub] 批量模式（可选，当 N > 5 时建议）:
   "要切换到批量模式吗？我可以一次性给出分类建议，你只需确认。"
   批量模式下: Hub 根据 capture-criteria + para-system 自动建议分类
   用户只需对每条说"确认"或"改到XX"

5. [Hub] 更新 hub-state.json:
   last_operations 开头插入: {action: "inbox_batch_process", count: N, kept: X, deleted: Y, time: "{now}"}
   更新 inbox_count: 0
   更新 inbox_last_cleared: "{now}"

6. [Hub] 按第 5 步标准结果卡片反馈:
   必须包含: 收件箱处理结果、保留/删除数量、各项目归入数量、建议提炼的项目、流程校验
```

### 场景 5：回顾整理

```
流程:
1. [Hub] 确认回顾范围:
   "做【周回顾】还是【月度回顾】？"
   (收件箱清理已独立为场景5A，此处不再包含)

2. 若选"周回顾":
   [knowledge-lifecycle] 每周小结流程:
   a. [obsidian-cli] list 收件箱 → 报告未处理数量（仅报告，不引导处理）
   b. [obsidian-cli] 列出本周新增笔记
   c. 检查各活跃项目的最后更新时间
   d. 形成周回顾的结构化发现与目标路径：`📂 项目/第二大脑体系搭建/复盘/{YYYY-WXX}.md`

3. 若选"月度回顾":
   [knowledge-lifecycle] 月度小结流程:
   a. 评估活跃项目列表（归档完成的、添加新的）
   b. 评估各领域是否需要行动
   c. 重新排列优先级
   d. 形成月度回顾的结构化发现与目标路径

4. [obsidian-markdown] 将回顾发现渲染为标准笔记模板，产出 `final_markdown`。

5. [obsidian-cli] 创建周/月回顾笔记。

6. [Hub] 按第 5 步标准结果卡片反馈:
   必须包含: 回顾范围、核心结论、收件箱状态、活跃项目进度、需要关注的停滞项、下一步、流程校验
```

### 场景 6：探索查询

```
流程:
1. [obsidian-cli] 全文搜索:
   obsidian vault="{vault_name}" search query="{关键词}" limit=20

2. [twelve-favorite-problems] 关联匹配（如果用户有定义问题清单）:
   加载 hub-state.json 中的 twelve_problems
   检查搜索结果是否能回答其中任何一个问题
   标注匹配结果

3. [Hub] 按第 5 步标准结果卡片反馈搜索结果:
   必须包含: 命中数量、最相关笔记、路径、一句话摘要、匹配到的兴趣问题、下一步、流程校验
```

---

## 第四步：统一 Obsidian 写入管道

所有场景最终写入都使用此模板和命令。

<HARD-GATE id="para-classified-before-write">
写入笔记之前必须满足以下全部条件，缺一不可：

1. ✅ 已完成目标归属判定（不得写入 Vault 根目录）
   - 外源保存、收件箱处理：必须调用 `para-system` 并记录 `target_folder`
   - 灵感速记：必须完成 Hub 快速归属追问，并记录 `target_path`
   - 回顾/创作：必须由对应场景流程生成目标项目或回顾路径
2. ✅ `Hub Run Ledger.target_path` 不为空，且不指向 Vault 根目录
3. ✅ 笔记内容已套用 4.1 标准模板（frontmatter 字段齐全）
4. ✅ status 字段设为 "inbox"（非 "processed" 或 "distilled"，除非经过完整提炼流程）
5. ✅ 文件名格式符合 "标题_YYYY-MM-DD.md"（灵感类加 HHmm）
6. ✅ `Hub Run Ledger.write_allowed = true`

禁止的行为：
- 未确认目标路径就直接写入
- 写入 Vault 根目录（即使用户说"随便放"）
- frontmatter 字段缺失（source / captured / project / status / tags / distill_level）
- 跳过模板直接拼接纯文本
- 文件名不规范导致后续查找困难
- 把 "Obsidian CLI 不可用" 当作跳过分类、筛选、提炼或模板的理由
</HARD-GATE>

### 4.1 标准笔记模板

```markdown
---
source: {{来源URL | 语音灵感 | 手动输入 | 文件导入}}
captured: {{YYYY-MM-DD HH:mm}}
project: {{归属项目名}}
status: inbox
tags: [{{tag1}}, {{tag2}}]
related: {{[[关联笔记]] 或 空}}
related_problems: {{[匹配的问题编号] 或 []}}
distill_level: {{0 | 1 | 2 | 3 | 4}}
---

# {{标题}}

{{正文内容}}

> [!abstract] 核心要点
> {{一句话摘要}}
```

### 4.2 写入命令

```bash
# 创建新笔记
obsidian vault="{vault_name}" create \
  name="{文件夹路径}/{文件名}" \
  content="{模板渲染后的完整 Markdown}" \
  silent

# 更新已有笔记（提炼后）
obsidian vault="{vault_name}" read file="{笔记名}"
# → 修改内容后 →
obsidian vault="{vault_name}" edit file="{笔记名}" content="{新内容}"

# 移动笔记（收件箱→项目）
obsidian vault="{vault_name}" file:move file="{笔记名}" to="{目标文件夹}"

# 搜索
obsidian vault="{vault_name}" search query="{关键词}" limit=20

# 追加内容（灵感追加到已有笔记）
obsidian vault="{vault_name}" append file="{笔记名}" content="{追加内容}"
```

### 4.3 frontmatter status 字段生命周期

```
inbox → processed → distilled → archived
  ↑        ↑           ↑           ↑
  刚抓取   已分类      已提炼      已归档（项目完成）
```

### 4.4 标题命名规范

- 灵感速记: `灵感-{关键词}_{YYYY-MM-DD-HHmm}`
- 外源保存: `{原标题简写}_{YYYY-MM-DD}`
- 创作草稿: `{序号}-{章节名}` (如 `01-引言`, `02-方法论`)
- 周回顾: `{YYYY-WXX}` (如 `2026-W24`)
- 一般笔记: `{描述性标题}`

---

## 第五步：反馈格式规范

Hub 的所有反馈遵循**结果优先 + 过程可查**。默认输出给普通用户看，不展示原始 `Hub Run Ledger`；但必须保留可审计的流程校验。

### 5.1 过程输出格式

每个场景开始时，先给用户一个简短预告：

```text
【开始】我会按「{场景名}」流程处理
【会做】{动作1} → {动作2} → {动作3} → {写入/更新/查询}
【需要你确认】{需要确认的问题；没有则写"暂时不需要"}
```

执行中需要用户选择时，使用决策卡片，不要把多个问题混在一起：

```text
【需要你决定】{一个明确问题}
【我的建议】{推荐答案 + 一句话理由}
【可选项】{选项 A} / {选项 B} / {选项 C}
```

长流程中每完成一个关键步骤，最多输出一张进度卡片：

```text
【进度】{当前步骤}/{总步骤}：{已完成的动作}
【发现】{关键发现或判断，一句话即可}
【下一步】{下一步动作}
```

### 5.2 最终输出格式

写入、更新、查询、回顾完成后，使用统一结果卡片：

```
【完成】{一句话说明结果}
【位置】{Vault 内路径；如可用，附 Obsidian 打开链接}
【核心要点】
1. {要点 1}
2. {要点 2，可省略}
3. {要点 3，可省略}
【处理摘要】{来源 / 字数变化 / 提炼层级 / 归属 / 处理数量等关键数字}
【下一步】{一个最自然的后续动作；没有则写"暂无"}
【流程校验】{用普通语言列出关键流程是否完成}
```

### 5.3 流程校验写法

`【流程校验】` 必须让普通用户看得懂，不直接输出 `vault_config`、`write_allowed` 等字段名。推荐写法：

```text
【流程校验】已确认知识库位置；已完成价值判断；已确认归属文件夹；已套用标准模板；已写入成功
```

如果某个步骤失败或被阻塞：

```text
【流程校验】已确认知识库位置；未完成归属确认，因此没有写入
【需要你决定】这条内容应该放到哪个项目或领域？
```

只有用户要求"查看审计/调试/执行链细节"时，才追加技术审计：

```text
【技术审计】{required_chain 中每一步的完成状态，如 defuddle ✓ → capture-criteria ✓ → para-system ✓ → write ✓}
【门控字段】vault-config={pass|blocked} | intent={场景} | target_path={路径或 null} | write_allowed={true|false}
```

### 5.4 场景示例

保存外源内容：

```text
【完成】已保存到「AI视频创作」项目
【位置】📂 项目/AI视频创作/文章标题_2026-07-13.md
【核心要点】
1. 这篇文章提出了一个可复用的视频脚本结构
2. 最值得保留的是开头钩子和分镜拆解方法
【处理摘要】网页正文 3200 字 → L1 摘录 280 字；已标记 2 句精华；归属为项目资料
【下一步】建议下次创作短视频脚本时引用这条笔记
【流程校验】已提取正文；已完成价值判断；已确认归属文件夹；已完成 L1 提炼；已套用标准模板；已写入成功
```

灵感速记：

```text
【完成】已记录这条灵感
【位置】📥 收件箱/灵感-AI分镜脚本草稿_2026-07-13-1430.md
【核心要点】
1. 可以把文章拆成镜头级素材，再交给视频工作流复用
【处理摘要】来源为手动输入；状态为 inbox；等待后续分类或提炼
【下一步】有空时可以把它归入具体项目
【流程校验】已确认知识库位置；已确认临时归属；已套用标准模板；已写入成功
```

查询结果：

```text
【完成】找到 6 条相关笔记
【位置】未写入新笔记
【核心要点】
1. 最相关的是「AI视频创作/脚本结构复盘」
2. 其中 2 条和你的长期问题清单有关
【处理摘要】搜索关键词：脚本结构；匹配项目 3 条、资源 2 条、存档 1 条
【下一步】要不要把这 6 条整理成一个创作素材包？
【流程校验】已确认知识库位置；已完成全文搜索；查询场景未执行写入
```

必选步骤被跳过时，不得报告写入成功；必须说明阻塞点并给出一个可执行的下一步。

---

## 第六步：边界与判停条件

### 不触发 Hub 的情况

- 纯闲聊、问候、无关话题 → 正常回复，不动用知识管理系统
- 一次性事实查询（"今天天气""某个函数的用法"）→ 直接回答
- 纯 Obsidian 技术操作（"帮我改个 CSS""装个插件"）→ 直接调用 obsidian-cli，不走 CODE 流程

### Hub 的失败模式防护

1. **不要强迫每条信息都走完整 CODE 流程** — 灵感速记是轻量场景，不需要 progressive-summarization
2. **不要在不确定时强行归类** — 问用户，不要猜
3. **不要创建孤岛笔记** — 每条笔记至少有一个 project/area/resource 归属
4. **不要在 hub-state.json 不存在时卡住** — 自动创建默认值
5. **不要阻塞用户** — 如果某个 skill 不可用，降级处理（如 defuddle 失败时让用户手动粘贴文本）

### Obsidian CLI 不可用时的降级策略

如果 `obsidian` CLI 返回错误（Obsidian 未运行、vault 未找到等）：
1. 先确认当前场景 `required_chain` 中所有写入前方法论步骤已经完成
2. 确认 `Hub Run Ledger.target_path`、`final_markdown`、`write_allowed` 均已就绪
3. 仅将写入后端从 `obsidian-cli` 替换为标准 Write 工具，直接创建 `.md` 文件到 vault 路径
4. 套用相同的统一模板，不得减少 frontmatter 字段
5. 告知用户："Obsidian 当前未运行，笔记已直接写入文件，下次打开 Obsidian 即可看到"

如果写入前方法论步骤未完成，则不得降级写入；必须先回到缺失步骤继续执行。

---

## 相关 skill 调用关系

```
second-brain-hub (本 skill)
  │
  ├── 场景1(速记)  → [Hub target_routing] → [obsidian-markdown] → [obsidian-cli/write]
  ├── 场景2(外源)  → [defuddle] → [capture-criteria] → [para-system] → [progressive-summarization(L1)] → [obsidian-markdown] → [obsidian-cli]
  ├── 场景3(提炼)  → [obsidian-cli read] → [progressive-summarization] → [obsidian-cli edit]
  ├── 场景4(创作)  → [diverge-converge, 条件] → [intermediate-packets] → [obsidian-cli search] → [progressive-summarization(L2, 条件)] → [creative-workflow] → [obsidian-markdown] → [obsidian-cli create]
  ├── 场景5A(收件箱) → [obsidian-cli list] → [para-system] → [obsidian-cli move]
  ├── 场景5(回顾)  → [knowledge-lifecycle] → [obsidian-cli list/search] → [obsidian-markdown] → [obsidian-cli create]
  └── 场景6(查询)  → [obsidian-cli search] → [twelve-favorite-problems(可选)]
```

---

## 版本变更记录

- **v1.0** (2026-06-13): 初始版本 — 6场景 + 意图识别 + 统一写入管道
- **v1.0.1** (2026-06-14): 场景2触发词扩展（"总结这篇文章/提取要点/提炼核心/精华"）+ 边界模糊安全网规则
- **v1.1** (2026-06-17): 收件箱批量处理(场景5A) + 创作启动丰满(场景4) + 渐进归纳深度集成 + auto-distill自动提炼规则 + 海明威之桥流程
- **v1.2** (2026-07-13): 增加 Hub Run Ledger、场景调用链契约、写入前执行锁、子 Skill 输出凭证、最终执行链审计，防止 Agent 跳过约定流程
- **v1.3** (2026-07-13): 标准化用户可见输出层，增加开始/进度/决策/完成卡片，隐藏默认技术字段，提升普通用户可读性

---

## 审计信息

- **创建日期**: 2026-06-13
- **依赖 skill**: 14 个（9 方法论 + 5 Obsidian）
- **Vault 路径**: 由本地 `hub-state.json`、环境变量或用户显式输入动态指定
- **Vault 名称**: 由 `preferences.vault_name` 动态指定
- **状态文件**: `{vault_path}\.obsidian\hub-state.json` + 本地 `hub-state.json`
