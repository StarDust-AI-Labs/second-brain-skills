# 🧠 第二大脑 · Skill 生态

> 基于蒂亚戈·福特《打造第二大脑》构建的 AI Agent 知识管理技能体系——将"知识记录"升级为"知识创造"，基于 Obsidian 技能全面掌管你的数字笔记。
>
> **一套面向知识工作者和内容创作者的 Agent 原生第二大脑：用方法论约束 AI，用本地 Markdown 掌控知识，用完整工作流把收藏推进到创造。**

***

## 为什么是这个项目

大多数知识库工具解决的是"把内容放进去"和"以后找出来"。这个项目更进一步——它把《打造第二大脑》的整套方法论，变成 AI Agent 能**实际执行**的工作流：

- **不只是收藏**：说"记一下"，灵感自动判断价值、归到对应项目；
- **不只是堆链接**：发个网页，AI 读完、提炼、写好摘要再入库；
- **不只是存储**：说"帮我写个大纲"，AI 翻遍你以前收藏的资料帮你起草；
- **不越用越乱**：周/月回顾 + CODE 瓶颈诊断，让知识库持续保持活性。

**核心理念**：知识管理的终点不是收藏，而是创造。

## 项目简介

本项目将《打造第二大脑》中的 CODE 信管法则、PARA 组织系统、渐进式归纳、十二问过滤和**海明威之桥**等方法论，工程化为 AI Agent 可直接调用的 Skill 体系。`second-brain-hub` 作为唯一入口，内置 9 个方法论能力模块和 5 个 Obsidian 工具 Skill——用户只需说"记一下灵感""保存这篇网页""提炼到 L2""帮我诊断为什么只收集不产出"，Agent 自动完成意图路由、契约编排、门控检查和知识写入。适配 Claude Code / Codex / Cursor / Coze / WorkBuddy 等主流 Agent 平台。

![第二大脑概念海报](<docs/第二大脑海报 (2).png>)

***

## 给其他用户的复制提示词

把下面这段提示词直接发给你的 agent。它只负责安全安装或更新 Skill；安装完成后，知识库初始化统一交给 `second-brain-hub/SETUP.md`，避免 README 和运行时流程重复维护：

```text
请帮我安装或更新「第二大脑」Skill，并在安装后按项目内置 SOP 帮我完成知识库设置。全程用大白话交流，每次只问一个问题；需要执行命令或修改文件时先说明并征得我同意，不要让我手工敲命令或编辑配置。

仓库：git@github.com:StarDust-AI-Labs/second-brain-skills.git（SSH 不可用时改用 HTTPS）。

请执行：

1. 根据当前 Agent 的实际配置和本机已有目录，确定它真正使用的 skills 目录，并告诉我判断依据；无法确定时再询问我。
2. 先判断本次是首次安装还是更新，再安全获取仓库最新 `main`。已有仓库存在未提交修改时不要覆盖或清理，改用临时目录或先询问我。
3. 从仓库顶层 `skills/` 安装或更新这 6 个目录：`second-brain-hub`、`defuddle`、`obsidian-markdown`、`obsidian-cli`、`obsidian-bases`、`json-canvas`。更新模式覆盖前，先说明备份方案并征得我同意；备份现有 6 个 Skill 目录，保留 `second-brain-hub/hub-state.json` 和我的自定义修改。发现来源不明的同名 Skill 时先问我，不要覆盖。
4. 安装完成后，以 `setup_trigger=post-install-prompt` 完整读取已安装目录中的 `second-brain-hub/SETUP.md`，严格按该文档完成首次初始化、配置修复或已有知识库复用；不要自行重复或改写 `SETUP.md` 的初始化步骤。
5. 验证 6 个 Skill 的 `SKILL.md` 均存在，并用大白话告诉我本次是安装还是更新、Skill 安装目录、使用的 Git commit、知识库设置结果；如果某个工具或能力不可用，逐项报告降级能力、替代方案和影响，不要静默跳过。

安全约束：先检查再操作；禁止 `git reset --hard`；不得删除、覆盖来源不明或带有未提交修改的文件；更新时必须保留已有 `hub-state.json`；任何能力降级都要逐项说明；`hub-state.json` 不得提交到 Git。

```

***

## 本地安装包入口

面向离线交付时，使用仓库或解压包根目录的 `install.mjs`。它由 Agent 调用，默认只预览；确认后才以 `--yes` 实际复制文件。核心初始化继续复用 `second-brain-hub/scripts/init-workspace.mjs`。

```text
node "<安装包目录>/install.mjs" --skills-dir "<当前 Agent 实际使用的 skills 目录>" --dry-run
node "<安装包目录>/install.mjs" --skills-dir "<当前 Agent 实际使用的 skills 目录>" --vault "<用户确认的知识库绝对路径>" --mode obsidian --yes
```

脚本支持 Windows、macOS 和 Linux 上的 Node.js；若存在多个候选 skills 目录或已有来源不明的同名 Skill，会返回 `need-input`，由 Agent 用大白话向用户确认，而不是猜测或覆盖。

开发者可运行 `scripts/build-offline-install-package.ps1` 生成包含根目录入口、6 个 Skill 和 ZIP 的离线交付包。

***

## 架构概览

> 四层架构：输入层 → Agent / Hub 层 → SKILL 层 → 存储层

```
┌─────────────────────────────────────────────────────┐
│  📥 输入层                                           │
│  语音转写 · 网页链接 · 文件上传 · 聊天消息               │
├─────────────────────────────────────────────────────┤
│  🤖 Agent / Hub 层                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │  🧭 second-brain-hub · 中枢调度器              │    │
│  │  意图识别 · 契约编排 · 运行台账 · 副作用门控     │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  🧩 SKILL 层 · 方法论能力与工具能力统一编排            │
│  📋 抓取：capture-criteria · twelve-favorite-problems│
│  🗂️ 组织：para-system                                │
│  ✨ 提炼：progressive-summarization                  │
│  🚀 表达：intermediate-packets · creative-workflow   │
│  🔧 工具：defuddle · markdown · cli · bases · canvas │
│  🔄 系统维护/诊断：knowledge-lifecycle                │
│                     code-diagnosis · diverge-converge │
├─────────────────────────────────────────────────────┤
│  💾 存储层                                           │
│  ┌─────────────────────────────────────────────┐    │
│  │  🗄️ Obsidian Vault · 第二大脑笔记库          │    │
│  │  PARA目录 · .md笔记 · hub-state.json · .canvas  │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

> 🎨 完整架构图：[architecture-diagram-v8.html](docs/architecture-diagram-v8.html)

***

## SKILL 层模块清单

### 🧭 中枢调度

| Skill              | 说明                                                    |
| ------------------ | ----------------------------------------------------- |
| `second-brain-hub` | 唯一入口：8 类意图 → 7 条 Vault 执行流 + 1 条只读诊断流 → Obsidian 写入管道 |

### 🧩 统一 SKILL 层

| 模块         | 能力 / Skill                                                                         | 职责                       |
| ---------- | ---------------------------------------------------------------------------------- | ------------------------ |
| 📋 抓取      | `capture-criteria`、`twelve-favorite-problems`                                      | 判断保存价值，以长期兴趣方向过滤信息       |
| 🗂️ 组织     | `para-system`                                                                      | 根据行动结果确定项目、领域、资源或存档归属    |
| ✨ 提炼       | `progressive-summarization`                                                        | 执行 L1-L4 渐进式提炼           |
| 🚀 表达      | `intermediate-packets`、`creative-workflow`                                         | 复用半熟素材，形成可继续推进或交付的产物     |
| 🔧 工具      | `defuddle`、`obsidian-markdown`、`obsidian-cli`、`obsidian-bases`、`json-canvas`       | 网页提取、模板渲染、Vault 操作和可视化   |
| 🔄 系统维护与诊断 | `knowledge-lifecycle`、`code-diagnosis`、`diverge-converge`、`second-brain-diagnosis` | 周月回顾、知识回收、CODE 瓶颈和创作模式诊断 |

方法论能力以内置 `module-*.md` 形式按需加载；工具模块仍保留独立 Tool Skill 实现，但在项目架构上统一归入 SKILL 层。

***

## 八条路由

| 场景       | 触发词             | 调度链                                                                                                      |
| -------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| 🔖 灵感速记  | "记一下""灵感""idea" | Hub 归属 → obsidian-markdown → obsidian-cli 写入                                                             |
| 📄 保存外源  | URL + "保存""收藏"  | defuddle → capture-criteria → para-system → progressive-summarization → obsidian-markdown → obsidian-cli |
| ✂️ 提炼加工  | "画重点""提炼""总结"   | obsidian-cli 查找 → progressive-summarization → 更新笔记                                                       |
| ✍️ 创作启动  | "写一篇""创作""生成"   | intermediate-packets → 条件 L2 提炼 → creative-workflow → obsidian-markdown → obsidian-cli 创建项目              |
| 📥 收件箱处理 | "清理收件箱""处理收件"   | obsidian-cli 列表 → para-system → 移动或删除；批量建议时条件调用 capture-criteria                                         |
| 📊 回顾整理  | "回顾""本周""整理"    | knowledge-lifecycle → obsidian-cli 检索 → obsidian-markdown → 生成周回顾                                        |
| 🔍 探索查询  | "找一下""搜索""有没有"  | obsidian-cli 搜索 → twelve-favorite-problems 匹配                                                            |
| 🧭 系统诊断  | "越管越乱""只收集不产出"  | CODE 瓶颈诊断 → 条件发散/聚合诊断 → 推荐进入一个执行场景（不写入 Vault）                                                            |

***

## 项目结构

```
second-brain/
├── skills/                  # 单一规范源（single source of truth）
│   ├── second-brain-hub/    # 唯一第二大脑入口
│   │   ├── SKILL.md         # 路由、门控与渐进加载索引
│   │   ├── route-contracts.json
│   │   ├── capability-contracts.json
│   │   └── references/      # 工作流、内部能力、方法论档案
│   ├── defuddle/             # 网页正文提取
│   ├── obsidian-markdown/    # Obsidian Markdown 渲染
│   ├── obsidian-cli/         # Vault 读写与检索
│   ├── obsidian-bases/       # Bases 数据视图
│   └── json-canvas/          # Canvas 文件
├── third-party/              # 上游许可证与插件元数据，非运行时依赖
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

***

## 运行时约定

- **单一规范源**：顶层 `skills/` 是项目规范源；第二大脑运行规范集中在 `skills/second-brain-hub/`，Obsidian 工具仍独立维护。
- **路由契约**：`skills/second-brain-hub/route-contracts.json` 是 Hub 场景链路、条件步骤和写入前置的唯一规范源；Hub 正文、测试提示与审计文档均应据此校验。
- **能力契约**：`skills/second-brain-hub/capability-contracts.json` 定义输入、输出、门控、失败策略和可移植实现定位。内部能力使用 Hub 相对 `reference`，外部工具使用 Skill `name`，不依赖仓库绝对路径。
- **Agent 自适应安装**：直接复制顶层 `skills/` 下的 6 个目录；重构前的方法论档案已归档到 `docs/archive/methodology-legacy/`，不随 Skill 安装分发，不要安装为平级 Skill。
- **运行时边界**：`scripts/`、`tests/`、`docs/`、`books/` 和 `third-party/` 仅用于开发、验证、文档与许可证归档，用户运行第二大脑时不需要安装，也不需要 Python。
- **多 agent 同步**：如果你同时使用多个 agent 产品，修改 Skill 内容后请确保从顶层 `skills/` 重新复制到各 agent 的目标目录。
- **配置模板**：`skills/second-brain-hub/hub-state.example.json` 只由 `second-brain-hub/SETUP.md` 在初始化时读取并生成本地 `hub-state.json`；普通用户不手工复制或编辑。
- **本地运行态配置**：`hub-state.json` 保存存储模式、Vault 或 Markdown 工作区路径、引导状态、偏好和 12 问题清单，属于本地文件，不提交到版本库。
- **Vault 运行态状态**：Obsidian 模式可在 `{vault_path}/.obsidian/hub-state.json` 保存 Vault 内运行记录；Markdown 模式只使用 Hub 旁的本地状态。

### 5 分钟快速开始

安装完成后直接对 Agent 说：

```text
记一下：这是我的第一条第二大脑笔记
```

如果尚未配置，Hub 会通过运行时适配层完整执行已安装目录中的 `second-brain-hub/SETUP.md`，用同一套 SOP 让你选择已有 Obsidian Vault、已有 Markdown 文件夹，或创建最小 Markdown 第二大脑。配置完成后会自动继续保存上面的原始笔记，不需要重新输入。

即使你是手工复制 Skill，也不需要复制模板或编辑 JSON；第一次使用时仍会进入同一份 `SETUP.md`。如果想在第一次记笔记前完成设置，直接对 Agent 说：“完整读取已安装的 `second-brain-hub/SETUP.md`，按 SOP 帮我初始化知识库。”

***

## 设计原则

1. **唯一公开入口** — 第二大脑请求统一由 Hub 识别和路由，避免平级 Skill 竞争触发
2. **内部能力模块化** — 方法论以 `module-*.md` 按需加载，完整历史内容归档在 `docs/archive/methodology-legacy/`（仅源仓库，不随安装分发）
3. **统一写入管道** — 所有笔记写入走同一套 frontmatter 模板
4. **金字塔反馈** — 所有输出遵循「结论→详情→下一步」格式
5. **契约驱动** — 路由、输出、门控和跳过理由都由机器可读契约校验

***

## 当前能力与边界（诚实说明）

这是一个**可实际使用的开源 Beta 项目**。它已超过概念 Demo，具备完整架构、运行协议和真实知识库写入能力，但仍有明确的边界：

**✅ 已具备**

- 8 类知识管理场景的统一入口路由；
- CODE/PARA 等方法论的工程化执行；
- Obsidian + 普通 Markdown 双存储模式；
- 契约、运行台账、写入/移动/删除安全门控；
- 首次运行引导与最小工作区初始化；
- 意图、路由、端到端、依赖、onboarding 等评测夹具。

**⚠️ 需要了解**

- **跨平台**：Skill 规范与 Markdown 数据具有迁移潜力，实际兼容程度取决于具体 Agent 平台；
- **检索方式**：当前以 Obsidian/文件搜索为主，**尚未内置向量语义检索 / 完整 RAG**；
- **安全性**：具备安全设计与测试门禁，但**不代表已通过全部生产级安全验证**；
- **自动化程度**：部分流程由 Agent 自动执行，但仍保留确认环节、受环境依赖与降级影响；
- **环境依赖**：执行稳定性受宿主 Agent、操作系统、Obsidian 是否运行等因素影响。

**❌ 暂不支持**

- Notion、飞书等第三方存储适配；
- 多 Vault 管理、自定义场景注册、团队协作；
- 一键式零门槛的大众化 SaaS 体验。

> 本项目更适合 **Obsidian/Markdown 用户、内容创作者、研究者和愿意接触 Agent 的高级用户**。如果你只想要"开箱即用、无需任何配置"的工具，它可能暂时不是最合适的选择。

***

## 版本路线

| 阶段            | 内容                                 | 状态     |
| ------------- | ---------------------------------- | ------ |
| **MVP (P0)**  | Vault PARA重组 + Hub中枢 + 灵感速记 + 保存外源 | ✅ 已完成  |
| **v1.1 (P1)** | 收件箱批量处理 + 创作启动 + 渐进归纳深度集成          | ✅ 已完成  |
| **v1.2 (P2)** | 周月回顾 + 12问题过滤 + Bases仪表盘           | 📋 计划中 |
| **v2.0 (P3)** | Cron定时回顾 + 收件箱预警 + 项目停滞检测          | 📋 计划中 |

***

## 依赖环境

- **AI Agent 平台**（Claude Code / Codex / Cursor / GitHub Copilot 等）— Skill 运行平台
- **Obsidian** — 可选的笔记浏览与插件生态；也可以只使用普通 Markdown 文件夹
- **Obsidian CLI** — 命令行笔记操作（可选，有降级方案）

***

## 致谢

- [obsidian-skills](https://github.com/kepano/obsidian-skills) by Steph Ango (@kepano) — MIT License

***

## 参考资源

- 📖 《打造第二大脑》— 蒂亚戈·福特（Tiago Forte）
- 🌐 [Building a Second Brain](https://www.buildingasecondbrain.com/)
- 🔗 [PARA Method](https://fortelabs.com/blog/para/)
- 🛠️ [Obsidian](https://obsidian.md/)

***

> *"你的大脑是用来产生想法的，不是用来储存它们的。"* — Tiago Forte
