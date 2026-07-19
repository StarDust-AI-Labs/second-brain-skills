# 🧠 第二大脑 · Skill 生态

> 基于蒂亚戈·福特《打造第二大脑》构建的 AI Agent 知识管理技能体系——将"知识记录"升级为"知识创造"，基于 Obsidian 技能全面掌管你的数字笔记。

***

## 项目简介

本项目将《打造第二大脑》中的 CODE 信管法则、PARA 组织系统、渐进式归纳、十二问过滤和**海明威之桥**等方法论，工程化为 AI Agent 可直接调用的 Skill 体系。`second-brain-hub` 作为唯一入口，内置 9 个方法论能力模块和 5 个 Obsidian 工具 Skill——用户只需说"记一下灵感""保存这篇网页""提炼到 L2""帮我诊断为什么只收集不产出"，Agent 自动完成意图路由、契约编排、门控检查和知识写入。适配 Claude Code / Codex / Cursor / Coze / WorkBuddy 等主流 Agent 平台。

**核心理念**：知识管理的终点不是收藏，而是创造。

![第二大脑概念海报](docs/第二大脑概念海报.png)

***

## 给其他用户的复制提示词

把下面这段提示词直接发给你的 agent。它会自动判断是首次安装还是更新已有版本，将最新 Skill 同步到正确目录，并保留本地 Vault 配置：

```text
请帮我安装或更新 second-brain-skill 项目，用它来管理我的本地 Obsidian 知识库。如果之前已经安装过，请拉取仓库最新版本并安全更新 Agent 工作空间中的 Skill。

请按下面步骤执行：

0. ⚠️ 首先检测当前 agent 产品类型，确定 Skill 安装目标目录：
   - Claude Code → 从 skills/ 复制到 .claude/skills/
   - Codex → 从 skills/ 复制到 .agents/skills/
   - Cursor → 从 skills/ 复制到 .cursor/skills/
   - Coze（扣子）→ 从 skills/ 复制到 .coze/skills/
   - WorkBuddy→ 从 skills/ 复制到 .workbuddy/skills/
   - Codeium / 其他国产 Agent → 查找该 agent 的 skills 约定目录，找不到则询问用户
   将检测结果和目标目录告知用户后再继续。
   本项目以顶层 skills/ 为单一规范源，所有安装都是从此目录复制。

1. 检测现有安装：
   - 检查目标 skills 目录中是否存在 `second-brain-hub/SKILL.md`
   - 检查同级是否存在 `defuddle`、`obsidian-markdown`、`obsidian-cli`、`obsidian-bases`、`json-canvas`
   - 如果存在 `second-brain-hub`，本次进入“更新模式”；否则进入“首次安装模式”
   - 如果同名 Skill 存在但无法确认来自本仓库，不要直接覆盖，先展示来源或差异并询问我

2. 获取仓库最新版本：
   - 仓库地址：git@github.com:StarDust-AI-Labs/second-brain-skills.git
   - 如果本机已经有该仓库且工作区干净，执行 `git fetch`，再使用安全的 fast-forward 更新获取最新 `main`
   - 如果已有仓库包含未提交修改，不要 reset、清理或覆盖；改为克隆到新的临时目录，或先询问我如何处理
   - 如果没有仓库则克隆；SSH 不可用时改用 HTTPS 地址
   - 记录本次安装所使用的 Git commit

3. 安装或更新 Skill：
   - `second-brain-hub` 是唯一公开入口；读取其中的 `dependencies.json`，同步安装5个隐藏工具依赖
   - 需要同步的目录严格限定为：`second-brain-hub`、`defuddle`、`obsidian-markdown`、`obsidian-cli`、`obsidian-bases`、`json-canvas`
   - 将这6个目录复制到步骤0确定的目标 skills 目录，保持每个 `SKILL.md` 位于目标 skills 目录的第一层
   - 不要复制 `scripts/`、`tests/`、`docs/`、`books/`、`artifacts/` 或 `third-party/`

4. 更新模式必须保护本地状态：
   - 更新前备份现有6个 Skill 目录，至少保留到本次验证成功
   - 必须保留 `second-brain-hub/hub-state.json`，它包含用户的 Vault 路径、偏好和本地运行状态
   - 不要用 `hub-state.example.json` 覆盖已有 `hub-state.json`
   - 如果用户修改过其他 Skill 程序文件，先展示差异；经用户确认后再用最新版本替换，旧版本保存在备份目录
   - 更新后检查过期依赖，但不要删除非本项目创建的目录
   - 在目标 Skill 根目录写入或更新 `.second-brain-install.json`，记录 `source_repository`、`source_commit`、`installed_at`、`agent_type` 和已安装的6个 Skill 名称；不得在其中记录 Vault 路径等隐私信息

5. 首次安装模式配置 Vault：
   - 不要求我手工编辑 JSON；安装完成后通过 second-brain-hub 的首次运行引导选择存储位置
   - 我可以选择已有 Obsidian Vault、已有 Markdown 文件夹，或创建最小 Markdown 第二大脑
   - 引导完成后由 Agent 从 `hub-state.example.json` 生成本地 `hub-state.json`
   - 确认 `hub-state.json` 不提交到 Git

6. 更新模式复用现有 Vault 配置：
   - 如果保留的 `hub-state.json` 中已有有效 `vault_path` 和 `vault_name`，不要再次询问
   - 如果配置缺失或路径已失效，再询问用户并修复配置

7. 检查本机是否已安装 Obsidian：
   - 如果选择 Obsidian 模式但尚未安装，请提供 https://obsidian.md/download
   - 如果选择 Markdown 模式，Obsidian 不是必需依赖，直接继续

8. 做一次最小可用验证：
   - 检查6个 Skill 的 `SKILL.md` 均存在，并核对 `dependencies.json` 中的5个依赖已安装；缺失依赖时报告降级能力
   - 检查已选择的 Vault 或 Markdown 工作区路径是否存在
   - 检查是否能创建或更新 Markdown 笔记
   - 用一句测试输入”记一下：这是 second-brain-skill 的安装验证”触发 second-brain-hub
   - 把测试笔记写入 Obsidian Vault 的合适位置
   - 更新模式验证失败时，恢复更新前备份并报告失败原因

9. 完成后请告诉我：
   - 本次是首次安装还是更新
   - 当前 agent 类型
   - 项目安装位置
   - Skill 安装目录
   - 安装使用的 Git commit
   - 已安装或更新的 Skill 列表
   - 当前绑定的 Vault 路径
   - 我以后可以怎么对你说话来保存网页、记录灵感、整理笔记和启动创作
   - 询问我："如果这个项目对你有帮助，要不要给 GitHub 仓库 Star 支持一下？"
   - 如果我回答愿意，请直接使用当前可用的 GitHub 登录态/CLI/API 给仓库 `StarDust-AI-Labs/second-brain-skills` 点 Star；如果缺少认证或工具不可用，再给出仓库链接让我手动操作

执行时请先检查当前系统、shell、agent 类型、已有仓库和 Skill 目录，再做文件操作。禁止使用 `git reset --hard` 或未经确认删除用户文件。更新时必须先备份并保留 `hub-state.json`；遇到来源不明的同名 Skill、未提交修改或覆盖风险时先问我。
```

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
- **配置模板**：`skills/second-brain-hub/hub-state.example.json` 是配置模板，安装时复制生成 `hub-state.json`。
- **本地运行态配置**：`hub-state.json` 保存存储模式、Vault 或 Markdown 工作区路径、引导状态、偏好和 12 问题清单，属于本地文件，不提交到版本库。
- **Vault 运行态状态**：Obsidian 模式可在 `{vault_path}/.obsidian/hub-state.json` 保存 Vault 内运行记录；Markdown 模式只使用 Hub 旁的本地状态。

### 5 分钟快速开始

安装完成后直接对 Agent 说：

```text
记一下：这是我的第一条第二大脑笔记
```

如果尚未配置，Hub 会用一个问题让你选择：已有 Obsidian Vault、已有 Markdown 文件夹，或创建最小 Markdown 第二大脑。配置完成后会自动继续保存上面的原始笔记，不需要重新输入。

如需预先手工配置 Obsidian 模式，可复制模板并填写：

```powershell
Copy-Item <second-brain-hub-skill-dir>\hub-state.example.json <second-brain-hub-skill-dir>\hub-state.json
```

然后编辑本地 `hub-state.json`：

```json
{
  "preferences": {
    "storage_mode": "obsidian",
    "workspace_path": "<你的 Obsidian Vault 绝对路径>",
    "workspace_name": "<你的 Obsidian Vault 名称>",
    "vault_path": "<你的 Obsidian Vault 绝对路径>",
    "vault_name": "<你的 Obsidian Vault 名称>"
  }
}
```

纯 Markdown 模式只需设置：

```json
{
  "preferences": {
    "storage_mode": "markdown",
    "workspace_path": "<Markdown 工作区绝对路径>",
    "workspace_name": "<工作区名称>"
  }
}
```

也可以使用环境变量：

```powershell
$env:SECOND_BRAIN_VAULT_PATH = "<你的 Obsidian Vault 绝对路径>"
$env:SECOND_BRAIN_VAULT_NAME = "<你的 Obsidian Vault 名称>"
```

Markdown 模式对应 `SECOND_BRAIN_STORAGE_MODE=markdown`、`SECOND_BRAIN_WORKSPACE_PATH` 和 `SECOND_BRAIN_WORKSPACE_NAME`。

***

## 设计原则

1. **唯一公开入口** — 第二大脑请求统一由 Hub 识别和路由，避免平级 Skill 竞争触发
2. **内部能力模块化** — 方法论以 `module-*.md` 按需加载，完整历史内容归档在 `docs/archive/methodology-legacy/`（仅源仓库，不随安装分发）
3. **统一写入管道** — 所有笔记写入走同一套 frontmatter 模板
4. **金字塔反馈** — 所有输出遵循「结论→详情→下一步」格式
5. **契约驱动** — 路由、输出、门控和跳过理由都由机器可读契约校验

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
