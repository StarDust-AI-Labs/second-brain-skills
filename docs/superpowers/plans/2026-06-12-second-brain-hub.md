# Second Brain Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `second-brain-hub` — the single entry point that receives any user input (voice, URL, text), classifies intent, orchestrates calls to the 9 CODE methodology skills, and writes structured notes into Obsidian via the 5 Obsidian skills.

**Architecture:** One new skill file (`second-brain-hub/SKILL.md`) acts as the orchestrator. It contains: intent recognition table → scene routing engine → context memory logic → unified Obsidian write pipeline. All 14 existing skills remain unchanged. The Hub reads/writes `hub-state.json` for cross-session memory and writes all notes through a standard frontmatter template.

**Tech Stack:** Markdown skill files, Obsidian CLI, bash for vault setup

**Deliverables:**
- `<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\SKILL.md`
- `<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\test-prompts.json`
- `<SECOND_BRAIN_VAULT>\.obsidian\hub-state.json` (context memory)
- Vault PARA folder structure (5 top-level folders + migration)

---

## File Responsibility Map

| File | Responsibility |
|------|---------------|
| `second-brain-hub/SKILL.md` | Intent classification, scene routing table, step-by-step orchestration instructions for Claude, unified Obsidian write pipeline, response format rules |
| `second-brain-hub/test-prompts.json` | 20 test prompts covering all 6 scenes + edge cases + intent boundary tests |
| `hub-state.json` | Cross-session memory: active projects list, last 5 operations, user preferences |
| Vault folder structure | Physical PARA folders created via bash in `<SECOND_BRAIN_VAULT>\` |

---

### Task 1: Set Up Vault PARA Folder Structure

**Files:**
- Create: `<SECOND_BRAIN_VAULT>\📥 收件箱\` (empty, placeholder `.gitkeep`)
- Create: `<SECOND_BRAIN_VAULT>\📂 项目\第二大脑体系搭建\`
- Create: `<SECOND_BRAIN_VAULT>\📂 项目\AI视频创作\`
- Create: `<SECOND_BRAIN_VAULT>\📂 项目\阅读分享\`
- Create: `<SECOND_BRAIN_VAULT>\📂 领域\AI技术\`
- Create: `<SECOND_BRAIN_VAULT>\📂 领域\内容创作\`
- Create: `<SECOND_BRAIN_VAULT>\📂 领域\知识管理\`
- Create: `<SECOND_BRAIN_VAULT>\📂 领域\职业发展\`
- Create: `<SECOND_BRAIN_VAULT>\📂 资源\AI前沿\`
- Create: `<SECOND_BRAIN_VAULT>\📂 资源\视频创作方法论\`
- Create: `<SECOND_BRAIN_VAULT>\📂 资源\写作素材\`
- Create: `<SECOND_BRAIN_VAULT>\📂 存档\2024-2025\`
- Create: `<SECOND_BRAIN_VAULT>\.obsidian\hub-state.json`

- [ ] **Step 1: Create the top-level PARA directories**

```bash
cd "<SECOND_BRAIN_VAULT>"
mkdir -p "📥 收件箱"
mkdir -p "📂 项目"
mkdir -p "📂 领域"
mkdir -p "📂 资源"
mkdir -p "📂 存档"
```

- [ ] **Step 2: Create subdirectories under 项目/**

```bash
mkdir -p "📂 项目/第二大脑体系搭建"
mkdir -p "📂 项目/AI视频创作"
mkdir -p "📂 项目/阅读分享"
```

- [ ] **Step 3: Create subdirectories under 领域/**

```bash
mkdir -p "📂 领域/AI技术"
mkdir -p "📂 领域/内容创作"
mkdir -p "📂 领域/知识管理"
mkdir -p "📂 领域/职业发展"
```

- [ ] **Step 4: Create subdirectories under 资源/**

```bash
mkdir -p "📂 资源/AI前沿"
mkdir -p "📂 资源/视频创作方法论"
mkdir -p "📂 资源/写作素材"
```

- [ ] **Step 5: Create archive snapshot directory**

```bash
mkdir -p "📂 存档/2024-2025"
```

- [ ] **Step 6: Snapshot all existing content into archive**

Move all current root-level files and folders (except the new PARA folders and `.obsidian`) into `📂 存档/2024-2025/`:

```bash
cd "<SECOND_BRAIN_VAULT>"
# Move root markdown files to archive
mv "AI创作方向.md" "📂 存档/2024-2025/"
mv "AI创作思路.md" "📂 存档/2024-2025/"
mv "AI宏大叙事.md" "📂 存档/2024-2025/"
mv "打造第二大脑-方法论笔记.md" "📂 存档/2024-2025/"

# Move old topic folders to archive
mv "AI技术实战" "📂 存档/2024-2025/"
mv "AI视频创作思路" "📂 存档/2024-2025/"
mv "视频文稿" "📂 存档/2024-2025/"
mv "阅读分享计划" "📂 存档/2024-2025/"

# 欢迎.md stays at root as vault entry point — do NOT move it
```

Expected result:
```
<SECOND_BRAIN_VAULT>\
├── 欢迎.md                        (untouched)
├── 📥 收件箱/                      (empty)
├── 📂 项目/                        (3 subdirs, empty)
├── 📂 领域/                        (4 subdirs, empty)
├── 📂 资源/                        (3 subdirs, empty)
├── 📂 存档/
│   └── 2024-2025/                 (all old content here)
└── .obsidian/
```

- [ ] **Step 7: Activate the 3 current projects — copy active files from archive**

```bash
cd "<SECOND_BRAIN_VAULT>"
# Project 1: 第二大脑体系搭建
cp "📂 存档/2024-2025/AI技术实战/AI大脑项目.md" "📂 项目/第二大脑体系搭建/"
cp "📂 存档/2024-2025/视频文稿/制作第二大脑.md" "📂 项目/第二大脑体系搭建/"

# Project 2: AI视频创作
cp "📂 存档/2024-2025/AI视频创作思路/古诗词意象影视化.md" "📂 项目/AI视频创作/"

# Project 3: 阅读分享
cp "📂 存档/2024-2025/AI视频创作思路/阅读计划.md" "📂 项目/阅读分享/"
```

- [ ] **Step 8: Create the initial hub-state.json**

Write `<SECOND_BRAIN_VAULT>\.obsidian\hub-state.json`:

```json
{
  "version": "1.0",
  "created": "2026-06-12",
  "active_projects": [
    "第二大脑体系搭建",
    "AI视频创作",
    "阅读分享"
  ],
  "last_operations": [],
  "preferences": {
    "default_distill_level": 1,
    "weekly_review_day": "friday",
    "inbox_warning_threshold": 15,
    "vault_path": "D:\\second-brain\\第二大脑"
  },
  "twelve_problems": []
}
```

- [ ] **Step 9: Verify the final vault structure**

```bash
cd "<SECOND_BRAIN_VAULT>"
find . -maxdepth 3 -not -path "*/.obsidian/*" -not -path "*/.trash*" | sort
```

Expected output: 5 top-level PARA folders, 3 projects with content, archive with all old content, 欢迎.md at root, hub-state.json in .obsidian.

- [ ] **Step 10: Commit vault changes**

```bash
cd "<SECOND_BRAIN_VAULT>"
git add -A
git commit -m "feat: reorganize vault with PARA structure + snapshot archive

- Create 收件箱/项目/领域/资源/存档 top-level folders
- Snapshot all existing content to 存档/2024-2025/
- Activate 3 current projects: 第二大脑体系搭建, AI视频创作, 阅读分享
- Add hub-state.json for cross-session context memory"
```

---

### Task 2: Create second-brain-hub SKILL.md

**Files:**
- Create: `<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\SKILL.md`

This is the core deliverable. The file must be complete with no placeholders — Claude can execute it directly.

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p "<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub"
```

- [ ] **Step 2: Write the complete SKILL.md**

Write `<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\SKILL.md` with the following content:

```markdown
---
name: second-brain-hub
description: |
  第二大脑知识管理中枢——所有信息输入的统一入口。接收语音转写、网页链接、文件、聊天消息等任意输入，自动进行意图识别，调度对应的CODE方法论skill（抓取→组织→提炼→表达），最终将知识写入Obsidian笔记库。
  
  触发场景: 当用户说"记一下""保存这篇文章""回顾本周""开始创作""帮我整理""找一下XX笔记"或任何需要与第二大脑交互的操作时触发。
  
  不适用于: 与知识管理无关的纯对话；纯Obsidian技术问题（直接用obsidian-cli skill）；一次性简单问答（如"今天天气怎么样"）。
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

## 第一步：加载上下文

每次被激活时，Hub 必须先加载状态：

```
1. 检查 <SECOND_BRAIN_VAULT>\.obsidian\hub-state.json 是否存在
2. 若存在 → 读取 active_projects, last_operations, preferences, twelve_problems
3. 若不存在 → 使用默认值（空项目列表、空操作历史），并创建该文件
4. 将状态加载到当前会话上下文中（供后续所有步骤引用）
```

---

## 第二步：意图识别

根据用户输入中的语言信号，将意图归类到以下 7 种之一：

| # | 意图类别 | 语言信号（关键词/模式） | 下一步 |
|---|---------|----------------------|--------|
| 1 | **灵感速记** | "记一下""灵感""想到""idea""点子""忽然""刚想到" | → 第三步-速记 |
| 2 | **保存外源** | URL/链接 + "保存""收藏""这篇文章""存下来""值得看" | → 第三步-外源 |
| 3 | **提炼加工** | "画重点""提炼""总结""摘要""帮我整理这段""标亮" | → 第三步-提炼 |
| 4 | **创作启动** | "写一篇""做一个""创作""生成""帮我写""做PPT""写方案" | → 第三步-创作 |
| 5 | **回顾整理** | "回顾""整理一下""本周""这周""每月""收件箱""清理" | → 第三步-回顾 |
| 6 | **探索查询** | "找一下""搜索""有没有""在哪""帮我查""关联" | → 第三步-查询 |
| 7 | **不确定** | 无法匹配以上任何模式 | → 简短追问澄清意图 |

**意图识别优先级**：
- URL 检测优先 → 只要有链接就是"保存外源"
- 明确的动作词（记/写/找/整理）次之
- 模糊输入最后处理 → 归入"不确定"

**追问模板**（仅在"不确定"时使用）：
> "你是想【记下来】/【找东西】/【开始创作】/【整理回顾】？简单说就行。"

---

## 第三步：按场景执行

### 场景 1：灵感速记

```
流程:
1. [Hub] 快速追问归属:
   "跟哪个项目有关？"
   列出 active_projects 供选择，允许说"都不相关"（则归入资源或收件箱）

2. [Hub] 判断是否需要 capture-criteria:
   灵感自带个人价值（"个性"标准天然满足），通常不需要严格筛选
   但如果用户表示不确定→调用 capture-criteria 做快速共鸣判断

3. [Hub] 生成笔记标题:
   格式: "灵感-{关键词}_{YYYY-MM-DD-HHmm}"
   例: "灵感-AI分镜脚本草稿_2026-06-12-1430"

4. [obsidian-cli] 写入笔记:
   obsidian vault="第二大脑" create name="{标题}" content="{模板内容}" folder="{归属文件夹}" silent
   
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

5. [Hub] 更新 hub-state.json:
   last_operations 开头插入: {action: "capture_inspiration", path: "{folder}/{filename}", time: "{now}"}
   保留最近 20 条

6. [Hub] 反馈用户:
   "已记入「{归属}」{位置} → [打开笔记](obsidian://open?vault=第二大脑&file={path})"
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
   
   → 不值得保留 → 反馈 "这条信息不太值得记，建议跳过"
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

6. [Hub] 更新 hub-state.json + 反馈:
   "已保存到「{项目名}」| 提取 {原文字数} → 保留 {摘录字数} | 标记了 {金句数} 句精华"
```

### 场景 3：提炼加工

```
流程:
1. [obsidian-cli] 找到目标笔记:
   obsidian vault="第二大脑" search query="{关键词}" limit=10
   向用户确认要提炼的是哪篇

2. [obsidian-cli] 读取当前内容:
   obsidian vault="第二大脑" read file="{笔记名}"

3. [progressive-summarization] 逐层提炼:
   问用户: "要做到第几层？"
   - L1 精简摘录（2分钟）
   - L2 加粗要点（5分钟）  
   - L3 高亮精华（2分钟）
   - L4 纲要总结（3分钟）
   默认只做 L1+L2

4. [obsidian-cli] 更新笔记:
   用提炼后的内容替换原笔记，保留 frontmatter 中 status 字段更新为 "distilled"

5. [Hub] 反馈:
   "提炼完成 | L1→L2 | 原 {N} 字 → 现在 30 秒可以回顾完"
```

### 场景 4：创作启动

```
流程:
1. [Hub] 确认创作主题:
   "你想创作什么？大概什么方向/主题？"

2. [intermediate-packets] 检索已有素材:
   [obsidian-cli] search query="{主题关键词}" vault="第二大脑"
   [obsidian-cli] search query="{相关概念}" vault="第二大脑"
   汇总匹配的笔记列表

3. [creative-workflow] 思想群岛:
   将所有匹配的笔记内容/摘要集中到一处
   排列成要点列表（先不做逻辑排序）
   然后引导用户排序 + 搭建逻辑桥梁 → 形成大纲
   
4. [obsidian-cli] 创建项目文件夹和文件:
   obsidian vault="第二大脑" create name="{项目名}/01-素材清单" ...
   obsidian vault="第二大脑" create name="{项目名}/02-大纲" ...
   obsidian vault="第二大脑" create name="{项目名}/03-草稿" ...

5. [creative-workflow] 海明威之桥:
   在大纲文件末尾添加:
   > ## 海明威之桥
   > **下次打开时**: {具体的下一步行动}
   > **当前状态**: {进行到哪了}
   > **易忘细节**: {关键上下文}

6. [Hub] 更新 active_projects（如果是新项目）+ 反馈:
   "创作环境已就绪 | {素材数} 个素材 | 大纲 {章节数} 节 | 下次打开从「{海明威之桥的内容}」开始"
```

### 场景 5：回顾整理

```
流程:
1. [Hub] 确认回顾范围:
   "做【周回顾】还是【月度回顾】还是【清理收件箱】？"

2a. 若选"周回顾":
   [knowledge-lifecycle] 每周小结流程:
   a. [obsidian-cli] list 收件箱 → 报告未处理数量
   b. [obsidian-cli] 列出本周新增笔记
   c. 检查各活跃项目的最后更新时间
   d. 生成周回顾笔记 → 领域/知识管理/周回顾/{YYYY-WXX}.md

2b. 若选"清理收件箱":
   对收件箱每一条:
   - 快速展示标题/摘要
   - 问: "保留还是删除？保留的话放哪个项目/领域？"
   - 保留→obsidian-cli move 到目标文件夹
   - 删除→obsidian-cli 移到 .trash
   - 最终报告: "收件箱 {N}→0 | 保留 {X} | 删除 {Y}"

3. [Hub] 反馈（金字塔式）:
   【本周核心】: {一句话总结}
   【收件箱】: {状态}
   【活跃项目】: {各项目进度}
   【⚠ 需要关注】: {停滞的项目或异常}
```

### 场景 6：探索查询

```
流程:
1. [obsidian-cli] 全文搜索:
   obsidian vault="第二大脑" search query="{关键词}" limit=20

2. [twelve-favorite-problems] 关联匹配（如果用户有定义问题清单）:
   加载 hub-state.json 中的 twelve_problems
   检查搜索结果是否能回答其中任何一个问题
   标注匹配结果

3. [Hub] 反馈搜索结果:
   列出匹配的笔记标题 + 路径 + 一句话摘要
   如果匹配到兴趣问题: "这篇笔记跟你关心的【问题X：{问题描述}】相关"
```

---

## 第四步：统一 Obsidian 写入管道

所有场景最终写入都使用此模板和命令。

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
obsidian vault="第二大脑" create \
  name="{文件夹路径}/{文件名}" \
  content="{模板渲染后的完整 Markdown}" \
  silent

# 更新已有笔记（提炼后）
obsidian vault="第二大脑" read file="{笔记名}" 
# → 修改内容后 →
obsidian vault="第二大脑" edit file="{笔记名}" content="{新内容}"

# 移动笔记（收件箱→项目）
obsidian vault="第二大脑" file:move file="{笔记名}" to="{目标文件夹}"

# 搜索
obsidian vault="第二大脑" search query="{关键词}" limit=20

# 追加内容（灵感追加到已有笔记）
obsidian vault="第二大脑" append file="{笔记名}" content="{追加内容}"
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

Hub 的所有反馈遵循**金字塔原理**：

```
【结论】{一句话概括做了什么}
【详情】{关键数字和路径}
【下一步】{建议的后续操作（可选）}
【⚠ 关注】{需要用户注意的事项（有则加）}
```

示例：
> 【结论】已保存到「AI视频创作」项目
> 【详情】原文 3200 字 → 摘录 280 字 | 标记 2 句金句 | 关联问题 #1 #3
> 【下一步】要不要现在做一层加粗提炼？只需 2 分钟

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
1. 使用标准的 Write 工具直接创建 `.md` 文件到 vault 路径
2. 套用相同的统一模板
3. 告知用户："Obsidian 当前未运行，笔记已直接写入文件，下次打开 Obsidian 即可看到"

---

## 相关 skill 调用关系

```
second-brain-hub (本 skill)
  │
  ├── 场景1(速记)  → [capture-criteria(可选)] → [obsidian-cli]
  ├── 场景2(外源)  → [defuddle] → [capture-criteria] → [para-system] → [progressive-summarization(L1)] → [obsidian-markdown] → [obsidian-cli]
  ├── 场景3(提炼)  → [obsidian-cli read] → [progressive-summarization] → [obsidian-cli edit]
  ├── 场景4(创作)  → [intermediate-packets] → [obsidian-cli search] → [creative-workflow] → [obsidian-cli create]
  ├── 场景5(回顾)  → [knowledge-lifecycle] → [obsidian-cli list/search] → [obsidian-cli create/move]
  └── 场景6(查询)  → [obsidian-cli search] → [twelve-favorite-problems(可选)]
```

---

## 审计信息

- **创建日期**: 2026-06-12
- **依赖 skill**: 14 个（9 方法论 + 5 Obsidian）
- **Vault 路径**: `<SECOND_BRAIN_VAULT>`
- **状态文件**: `.obsidian/hub-state.json`
```

- [ ] **Step 3: Verify the SKILL.md is valid markdown with correct frontmatter**

```bash
cd "<SECOND_BRAIN_PROJECT>"
head -10 .claude/skills/second-brain-hub/SKILL.md
```

Expected: Valid YAML frontmatter with `name: second-brain-hub`, `description`, `tags`, `related_skills`, `priority`.

- [ ] **Step 4: Commit the new skill**

```bash
cd "<SECOND_BRAIN_PROJECT>"
git add .claude/skills/second-brain-hub/SKILL.md
git commit -m "feat: add second-brain-hub skill — central orchestrator for all knowledge management

- Intent recognition engine with 7 categories
- 6 scene workflows: quick capture, save external, distill, create, review, search
- Unified Obsidian write pipeline with standard template
- Context memory via hub-state.json
- Pyramid-principle feedback format
- Graceful degradation when Obsidian CLI is unavailable"
```

---

### Task 3: Create test-prompts.json

**Files:**
- Create: `<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\test-prompts.json`

- [ ] **Step 1: Write the test prompts file**

Write `<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\test-prompts.json`:

```json
[
  {
    "id": "t01",
    "scene": "灵感速记",
    "input": "记一下，刚才想到可以用AI自动生成视频分镜脚本",
    "expected_intent": "灵感速记",
    "expected_project_hint": "AI视频创作",
    "expected_obsidian_action": "create",
    "should_trigger_capture_criteria": false
  },
  {
    "id": "t02",
    "scene": "灵感速记",
    "input": "灵感来了：知识管理的本质不是管理信息，是管理注意力",
    "expected_intent": "灵感速记",
    "expected_obsidian_action": "create",
    "should_trigger_capture_criteria": false
  },
  {
    "id": "t03",
    "scene": "灵感速记",
    "input": "有个idea，记下来。用para系统可以把所有数字文件都管起来",
    "expected_intent": "灵感速记",
    "expected_project_hint": "第二大脑体系搭建",
    "expected_obsidian_action": "create"
  },
  {
    "id": "t04",
    "scene": "灵感速记-不确定归属",
    "input": "记一下，人类和AI协作的本质是意图对齐",
    "expected_intent": "灵感速记",
    "expected_behavior": "追问归属项目或领域"
  },
  {
    "id": "t05",
    "scene": "保存外源",
    "input": "保存这篇文章 https://mp.weixin.qq.com/s/example-ai-video",
    "expected_intent": "保存外源",
    "expected_chain": ["defuddle", "capture-criteria", "para-system", "progressive-summarization", "obsidian-cli"]
  },
  {
    "id": "t06",
    "scene": "保存外源",
    "input": "这篇文章值得收藏 https://example.com/blog/second-brain-tips",
    "expected_intent": "保存外源",
    "expected_chain": ["defuddle", "capture-criteria", "para-system", "obsidian-cli"]
  },
  {
    "id": "t07",
    "scene": "保存外源-不值得保留",
    "input": "保存这个 https://example.com/random-news  （内容质量低）",
    "expected_intent": "保存外源",
    "expected_behavior": "capture-criteria 判断后建议跳过"
  },
  {
    "id": "t08",
    "scene": "提炼加工",
    "input": "帮我提炼一下这篇文章的重点",
    "expected_intent": "提炼加工",
    "expected_chain": ["obsidian-cli find", "obsidian-cli read", "progressive-summarization", "obsidian-cli update"]
  },
  {
    "id": "t09",
    "scene": "提炼加工",
    "input": "给这篇笔记画一下重点，加粗关键句",
    "expected_intent": "提炼加工",
    "expected_distill_level": 2
  },
  {
    "id": "t10",
    "scene": "创作启动",
    "input": "我想写一篇关于AI如何改变创作方式的文章",
    "expected_intent": "创作启动",
    "expected_chain": ["intermediate-packets", "obsidian-cli search", "creative-workflow", "obsidian-cli create"]
  },
  {
    "id": "t11",
    "scene": "创作启动",
    "input": "帮我做一个关于第二大脑的分享PPT大纲",
    "expected_intent": "创作启动",
    "expected_chain": ["intermediate-packets", "obsidian-cli search", "creative-workflow"]
  },
  {
    "id": "t12",
    "scene": "回顾整理",
    "input": "回顾一下这周做了什么",
    "expected_intent": "回顾整理",
    "expected_chain": ["knowledge-lifecycle", "obsidian-cli"]
  },
  {
    "id": "t13",
    "scene": "回顾整理",
    "input": "帮我清理一下收件箱",
    "expected_intent": "回顾整理",
    "expected_behavior": "逐条引导分类，报告清空结果"
  },
  {
    "id": "t14",
    "scene": "回顾整理",
    "input": "本月回顾",
    "expected_intent": "回顾整理",
    "expected_review_type": "monthly"
  },
  {
    "id": "t15",
    "scene": "探索查询",
    "input": "找一下关于AI视频创作的笔记",
    "expected_intent": "探索查询",
    "expected_chain": ["obsidian-cli search"]
  },
  {
    "id": "t16",
    "scene": "探索查询",
    "input": "有没有关于知识管理的笔记？",
    "expected_intent": "探索查询",
    "expected_chain": ["obsidian-cli search"]
  },
  {
    "id": "t17",
    "scene": "不确定",
    "input": "帮我看看",
    "expected_intent": "不确定",
    "expected_behavior": "追问澄清意图"
  },
  {
    "id": "t18",
    "scene": "不应触发",
    "input": "今天天气怎么样",
    "expected_intent": null,
    "expected_behavior": "不触发Hub，直接回答"
  },
  {
    "id": "t19",
    "scene": "边界-降级",
    "input": "保存这篇文章 https://example.com/article  （假设defuddle不可用）",
    "expected_behavior": "降级处理：让用户手动粘贴文本内容"
  },
  {
    "id": "t20",
    "scene": "边界-Obsidian未运行",
    "input": "记一下灵感：测试内容 （假设Obsidian CLI不可用）",
    "expected_behavior": "降级处理：直接写入.md文件到vault路径"
  }
]
```

- [ ] **Step 2: Verify the JSON is valid**

```bash
cd "<SECOND_BRAIN_PROJECT>"
python -c "import json; json.load(open('.claude/skills/second-brain-hub/test-prompts.json', encoding='utf-8')); print('Valid JSON,', len(json.load(open('.claude/skills/second-brain-hub/test-prompts.json', encoding='utf-8'))), 'test cases')"
```

Expected: `Valid JSON, 20 test cases`

- [ ] **Step 3: Commit**

```bash
cd "<SECOND_BRAIN_PROJECT>"
git add .claude/skills/second-brain-hub/test-prompts.json
git commit -m "test: add 20 test prompts for second-brain-hub covering all 6 scenes + edge cases"
```

---

### Task 4: End-to-End Validation

**Files:**
- Verify: All created files exist and are valid
- Test: Skill triggering via test prompts

- [ ] **Step 1: Verify all deliverables exist**

```bash
echo "=== Checking deliverables ==="
echo "1. Hub SKILL.md:"
ls -la "<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\SKILL.md"
echo ""
echo "2. Test prompts:"
ls -la "<SECOND_BRAIN_PROJECT>\.claude\skills\second-brain-hub\test-prompts.json"
echo ""
echo "3. hub-state.json:"
ls -la "<SECOND_BRAIN_VAULT>\.obsidian\hub-state.json"
echo ""
echo "4. Vault PARA structure:"
ls -d "<SECOND_BRAIN_VAULT>\📥 收件箱" "<SECOND_BRAIN_VAULT>\📂 项目" "<SECOND_BRAIN_VAULT>\📂 领域" "<SECOND_BRAIN_VAULT>\📂 资源" "<SECOND_BRAIN_VAULT>\📂 存档"
echo ""
echo "5. Active projects have content:"
ls "<SECOND_BRAIN_VAULT>\📂 项目\第二大脑体系搭建\"
ls "<SECOND_BRAIN_VAULT>\📂 项目\AI视频创作\"
ls "<SECOND_BRAIN_VAULT>\📂 项目\阅读分享\"
```

Expected: All 5 checks pass — every file and folder exists.

- [ ] **Step 2: Validate SKILL.md frontmatter is parseable**

```bash
cd "<SECOND_BRAIN_PROJECT>"
python -c "
import re
with open('.claude/skills/second-brain-hub/SKILL.md', encoding='utf-8') as f:
    content = f.read()
# Check frontmatter exists and has required fields
fm_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
if fm_match:
    fm = fm_match.group(1)
    required = ['name:', 'description:', 'tags:', 'related_skills:']
    for r in required:
        assert r in fm, f'Missing required field: {r}'
    print('Frontmatter valid. All required fields present.')
else:
    print('ERROR: No frontmatter found')
"
```

Expected: `Frontmatter valid. All required fields present.`

- [ ] **Step 3: Validate skill composes-with references are real**

```bash
cd "<SECOND_BRAIN_PROJECT>\.claude\skills"
echo "Existing skills:"
ls -d */ | sed 's/\///g'
echo ""
echo "Hub references:"
grep -A1 "related_skills:" second-brain-hub/SKILL.md
```

Manually verify: every skill name listed in `related_skills` corresponds to an existing directory or a known system skill.

- [ ] **Step 4: Check that existing methodology skills are UNCHANGED**

```bash
cd "<SECOND_BRAIN_PROJECT>"
git status .claude/skills/
```

Expected: Only `second-brain-hub/` shows as new. All other skill directories are untouched.

- [ ] **Step 5: Final commit**

```bash
cd "<SECOND_BRAIN_PROJECT>"
git add -A
git status
```

Expected: Only new files added, no modifications to existing skills.

---

## Implementation Order

```
Task 1 (Vault setup) ──→ Task 2 (Hub SKILL.md) ──→ Task 3 (test prompts) ──→ Task 4 (validation)
         │                        │                         │                        │
    10 steps                  4 steps                   3 steps                  5 steps
    ~15 min                  ~30 min                   ~10 min                 ~10 min
```

**Total estimated time: ~65 minutes**

## Success Criteria

After all tasks complete:

1. `<SECOND_BRAIN_VAULT>\` has PARA folder structure with archived old content
2. `hub-state.json` exists and is valid JSON
3. `second-brain-hub/SKILL.md` contains all 6 scene workflows with complete instructions
4. `test-prompts.json` has 20 test cases covering all scenes + edge cases
5. Zero modifications to existing 9 methodology skills and 5 Obsidian skills
6. Hub can receive "记一下，灵感是XXX" and produce a correctly-placed Obsidian note
