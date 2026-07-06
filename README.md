# 🧠 第二大脑 · Skill 生态

> 基于蒂亚戈·福特《打造第二大脑》构建的 AI Agent 知识管理技能体系——将"信息消费"转化为"知识创造"，基于 Obsidian 技能全面掌管你的数字笔记。

---

## 项目简介

本项目是一套完整的**个人知识管理（PKM）Skill 体系**，运行在 Claude Code 平台上。
它将《打造第二大脑》中的 CODE 信管法则蒸馏为 9 个可执行的方法论 Skill + 5 个 Obsidian 工具 Skill，并通过一个中枢调度器（`second-brain-hub`）统一编排，最终将知识写入 Obsidian 笔记库。

**核心理念**：信息管理的终点不是"知道"，而是"做出"。

---

## 给其他用户的复制提示词

把下面这段提示词直接发给你的 agent，它会自动检测运行平台、下载本项目、安装 Skill 到正确目录，并引导你对接到本地 Obsidian 知识库：

```text
请帮我安装并配置 second-brain-skill 项目，用它来管理我的本地 Obsidian 知识库。

请按下面步骤执行：

0. ⚠️ 首先检测当前 agent 产品类型，确定 Skill 安装目标目录：
   - Claude Code → 从 skills/ 复制到 .claude/skills/
   - Codex → 从 skills/ 复制到 .agents/skills/
   - Cursor → 从 skills/ 复制到 .cursor/skills/
   - GitHub Copilot → 从 skills/ 复制到 .github/copilot/skills/
   - Windsurf / Codeium / 其他 → 查找该 agent 的 skills 约定目录，找不到则询问用户
   将检测结果和目标目录告知用户后再继续。
   本项目以顶层 skills/ 为单一规范源，所有安装都是从此目录复制。

1. 下载项目：
   - 优先克隆仓库 git@gitee.com:hyniubi/second-brain-skill.git
   - 如果当前环境不能使用 SSH，请提示我提供 HTTPS 地址或 Git 凭据

2. 安装 Skill 到步骤 0 确定的目标目录：
   - 从项目的 skills/（单一规范源）复制到目标目录
   - 不要覆盖我已有的同名 Skill，覆盖前先列出差异并询问我

3. 安装本项目的核心 Skill：
   - second-brain-hub
   - second-brain-code
   - capture-criteria
   - twelve-favorite-problems
   - para-system
   - progressive-summarization
   - creative-workflow
   - diverge-converge
   - intermediate-packets
   - knowledge-lifecycle
   - obsidian-skills-main 里的 Obsidian 工具 Skill

4. 引导我对接本地 Obsidian Vault：
   - 询问我的 Obsidian Vault 绝对路径
   - 询问我的 Vault 名称
   - 从 .claude/hub-state.example.json 复制生成本地 hub-state.json
   - 写入 preferences.vault_path 和 preferences.vault_name
   - 确认 hub-state.json 不提交到 Git

5. 做一次最小可用验证：
   - 检查 Vault 路径是否存在
   - 检查是否能创建或更新 Markdown 笔记
   - 用一句测试输入”记一下：这是 second-brain-skill 的安装验证”触发 second-brain-hub
   - 把测试笔记写入 Obsidian Vault 的合适位置

6. 配置完成后，请告诉我：
   - 当前 agent 类型
   - 项目安装位置
   - Skill 安装目录
   - 当前绑定的 Vault 路径
   - 我以后可以怎么对你说话来保存网页、记录灵感、整理笔记和启动创作

执行时请先检查当前系统、shell、agent 类型和已有目录结构，再做文件操作。遇到不确定的安装目录或覆盖风险时先问我。
```

---

## 架构概览

> 五层架构：输入层 → Agent层 → 方法论层 → 工具层 → 存储层

```
┌─────────────────────────────────────────────────────┐
│  📥 输入层                                           │
│  语音转写 · 网页链接 · 文件上传 · 聊天消息               │
├─────────────────────────────────────────────────────┤
│  🤖 Agent层                                         │
│  ┌─────────────────────────────────────────────┐    │
│  │  🧭 second-brain-hub · 中枢调度器              │    │
│  │  意图识别 · 场景路由 · 上下文记忆 · 统一写入     │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  📚 方法论层  (C·O·D·E 信管法则)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │📋 抓取    │ │🗂️ 组织   │ │✨ 提炼    │ │🚀 表达   ││
│  │capture   │ │Organize  │ │Distill   │ │Express   ││
│  │criteria  │ │para-     │ │prog-     │ │inter-    ││
│  │twelve-   │ │system    │ │ressive-  │ │mediate-  ││
│  │problems  │ │          │ │summari-  │ │packets   ││
│  │          │ │          │ │zation    │ │creative- ││
│  │          │ │          │ │diverge-  │ │workflow  ││
│  │          │ │          │ │converge  │ │          ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│  🧭 second-brain-code  ·  🔄 knowledge-lifecycle    │
├─────────────────────────────────────────────────────┤
│  🔧 工具层 (Obsidian 工具链)                          │
│  obsidian-cli · obsidian-markdown · obsidian-bases  │
│  json-canvas  ·  defuddle                           │
├─────────────────────────────────────────────────────┤
│  💾 存储层                                           │
│  ┌─────────────────────────────────────────────┐    │
│  │  🗄️ Obsidian Vault · 第二大脑笔记库          │    │
│  │  PARA目录 · .md笔记 · hub-state.json · .canvas  │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

> 🎨 完整 SVG 架构图：[architecture-diagram-v8.html](docs/architecture-diagram-v8.html)

---

## Skill 清单

### 🧭 中枢调度

| Skill | 说明 |
|-------|------|
| `second-brain-hub` | 统一入口：7类意图识别 → 6大场景流程 → Obsidian写入管道 |

### 📚 9 大方法论 Skill（来自《打造第二大脑》）

| 阶段 | Skill | 说明 |
|------|-------|------|
| 🧭 顶层框架 | `second-brain-code` | CODE信管法则：抓取→组织→提炼→表达 |
| 🧭 顶层框架 | `diverge-converge` | 发散与聚合：创作活动的底层节律 |
| 📋 信息输入 | `capture-criteria` | 共鸣原则：四标准判断"什么值得记录" |
| 📋 信息输入 | `twelve-favorite-problems` | 十二个兴趣问题：用好奇心导航信息消费 |
| 🗂️ 信息组织 | `para-system` | PARA系统：项目/领域/资源/存档四类分类 |
| 🗂️ 信息组织 | `progressive-summarization` | 渐进式归纳法：四层级笔记提炼技术 |
| 🚀 创造产出 | `intermediate-packets` | 半熟素材思维：永不从零开始 |
| 🚀 创造产出 | `creative-workflow` | 创造性工作流：思想群岛+海明威之桥+压缩范围 |
| 🔄 系统维护 | `knowledge-lifecycle` | 知识生命周期：周月回顾+处处留意 |

### 🔧 5 大 Obsidian 工具 Skill

| Skill | 说明 |
|-------|------|
| `obsidian-cli` | Obsidian 命令行操作 |
| `obsidian-markdown` | Obsidian 风格 Markdown（wikilinks/callouts/frontmatter） |
| `obsidian-bases` | Obsidian Bases 数据库视图 |
| `json-canvas` | JSON Canvas 画布 |
| `defuddle` | 网页→Markdown 提取 |

---

## 六大场景

| 场景 | 触发词 | 调度链 |
|------|--------|--------|
| 🔖 灵感速记 | "记一下""灵感""idea" | Hub → 追问归属 → obsidian-cli 写入 |
| 📄 保存外源 | URL + "保存""收藏" | defuddle → capture-criteria → para-system → progressive-summarization → obsidian-cli |
| ✂️ 提炼加工 | "画重点""提炼""总结" | obsidian-cli 查找 → progressive-summarization → 更新笔记 |
| ✍️ 创作启动 | "写一篇""创作""生成" | intermediate-packets → creative-workflow → obsidian-cli 创建项目 |
| 📊 回顾整理 | "回顾""本周""整理" | knowledge-lifecycle → obsidian-cli 生成周回顾 |
| 🔍 探索查询 | "找一下""搜索""有没有" | obsidian-cli 搜索 → twelve-favorite-problems 匹配 |

---

## 项目结构

```
second-brain/
├── skills/                  # 单一规范源（single source of truth）
│   ├── second-brain-hub/    # 中枢调度器（MVP核心）
│   ├── second-brain-code/   # CODE 信管法则
│   ├── capture-criteria/    # 抓取标准
│   ├── twelve-favorite-problems/
│   ├── para-system/         # PARA 组织系统
│   ├── progressive-summarization/
│   ├── creative-workflow/
│   ├── diverge-converge/
│   ├── intermediate-packets/
│   ├── knowledge-lifecycle/
│   └── obsidian-skills-main/ # 5个Obsidian工具skill
├── .claude/                 # Claude Code 配置目录
│   ├── hub-state.example.json # 可提交的配置模板
│   ├── hub-state.json       # 本地运行态配置（不提交，首次运行时创建）
│   ├── settings.local.json  # 本地权限配置（不提交）
│   └── scheduled_tasks.json # 定时任务配置（不提交）
├── docs/                    # 设计文档
│   ├── superpowers/
│   │   ├── specs/           # 设计方案
│   │   ├── plans/           # 实施计划
│   │   └── reports/         # 验收报告
│   ├── runbooks/            # 人工验收与运行手册
│   └── reference/           # 状态 schema、字段规范
├── scripts/                 # 轻量验证脚本
├── tests/                   # 评测用例
├── books/                   # 拆书审计记录
│   └── building-second-brain/
│       ├── INDEX.md         # Skill索引+依赖图
│       ├── candidates/      # 候选池（框架/原则/案例/术语）
│       └── rejected/        # 被淘汰的候选
└── CLAUDE.md                # 项目指令
```

---

## 运行时约定

- **单一规范源**：顶层 `skills/` 是本项目的唯一规范源（single source of truth），所有方法论 Skill 和 Obsidian 工具 Skill 在此维护。
- **Agent 自适应安装**：用户克隆项目后，由 `skills/` 复制到对应 agent 的 skills 目录：Claude Code → `.claude/skills/`，Codex → `.agents/skills/`，Cursor → `.cursor/skills/`，GitHub Copilot → `.github/copilot/skills/`，其他按平台约定。
- **多 agent 同步**：如果你同时使用多个 agent 产品，修改 Skill 内容后请确保从顶层 `skills/` 重新复制到各 agent 的目标目录。
- **配置模板**：`.claude/hub-state.example.json` 可随 Skill 一起安装，真实配置从模板复制生成。
- **本地运行态配置**：`.claude/hub-state.json` 保存 `vault_path`、`vault_name`、`active_projects`、偏好和 12 问题清单，属于本地文件，不提交到版本库。
- **Vault 运行态状态**：`{vault_path}/.obsidian/hub-state.json` 保存 Vault 内运行记录；不存在时由 Hub 根据项目级配置创建。

### 首次安装配置

复制配置模板并填写你自己的 Obsidian Vault 信息。若安装的是整个项目，使用项目级模板：

```powershell
Copy-Item .claude\hub-state.example.json .claude\hub-state.json
```

若只把 `second-brain-hub` Skill 单独安装给 agent，复制 Skill 目录旁的模板：

```powershell
Copy-Item <second-brain-hub-skill-dir>\hub-state.example.json <second-brain-hub-skill-dir>\hub-state.json
```

然后编辑本地 `hub-state.json`：

```json
{
  "preferences": {
    "vault_path": "<你的 Obsidian Vault 绝对路径>",
    "vault_name": "<你的 Obsidian Vault 名称>"
  }
}
```

也可以不创建文件，改用环境变量：

```powershell
$env:SECOND_BRAIN_VAULT_PATH = "<你的 Obsidian Vault 绝对路径>"
$env:SECOND_BRAIN_VAULT_NAME = "<你的 Obsidian Vault 名称>"
```

---

## 设计原则

1. **Hub 不重复造轮子** — 方法论判断全权交给子 Skill，Hub 只管调度
2. **方法论 Skill 零改动** — Hub 是调用者，不修改已有 Skill
3. **统一写入管道** — 所有笔记写入走同一套 frontmatter 模板
4. **金字塔反馈** — 所有输出遵循「结论→详情→下一步」格式
5. **渐进式实施** — MVP → v1.1 → v1.2 → v2.0 四阶段迭代

---

## 版本路线

| 阶段 | 内容 | 状态 |
|------|------|------|
| **MVP (P0)** | Vault PARA重组 + Hub中枢 + 灵感速记 + 保存外源 | ✅ 已完成 |
| **v1.1 (P1)** | 收件箱批量处理 + 创作启动 + 渐进归纳深度集成 | ✅ 已完成 |
| **v1.2 (P2)** | 周月回顾 + 12问题过滤 + Bases仪表盘 | 📋 计划中 |
| **v2.0 (P3)** | Cron定时回顾 + 收件箱预警 + 项目停滞检测 | 📋 计划中 |

---

## 依赖环境

- **AI Agent 平台**（Claude Code / Codex / Cursor / GitHub Copilot 等）— Skill 运行平台
- **Obsidian** — 笔记存储与浏览（Vault 路径：用户配置的本地 Obsidian 笔记存放目录）
- **Obsidian CLI** — 命令行笔记操作（可选，有降级方案）

---

## 参考资源

- 📖 《打造第二大脑》— 蒂亚戈·福特（Tiago Forte）
- 🌐 [Building a Second Brain](https://www.buildingasecondbrain.com/)
- 🔗 [PARA Method](https://fortelabs.com/blog/para/)
- 🛠️ [Obsidian](https://obsidian.md/)

---

> *"你的大脑是用来产生想法的，不是用来储存它们的。"* — Tiago Forte
