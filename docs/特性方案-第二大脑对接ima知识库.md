# 特性方案：second-brain-hub 同时支持 Obsidian 与 ima 知识库

- 版本：v0.1（设计稿）
- 日期：2026-07-29
- 状态：待评审
- 涉及 Skill：`second-brain-hub`（主）、新增依赖 `ima-skills`

---

## 1. 背景与目标

### 1.1 背景

当前 `second-brain-hub` 的存储层只有一种形态：**本地文件系统**（Obsidian Vault 或普通 Markdown 文件夹），所有读写都收敛到 `obsidian-cli` 这一个能力上，辅以 `direct-vault-filesystem` 降级。

腾讯 ima 已官方发布 ima-skills（SkillHub 上架：https://www.skillhub.cn/skills/ima-skills），以 API Key 方式通过 ima OpenAPI 暴露能力：

| ima 模块 | 已验证可用能力 |
|---|---|
| 知识库 | 知识库列表读取、搜索查询、将网页/微信文章加入指定知识库、上传文件到指定知识库 |
| 笔记 | 精准搜索、读取内容、新建笔记、追加笔记 |

- 安装包：`https://app-dl.ima.qq.com/skills/ima-skills-1.1.2.zip`
- API Key 获取：`https://ima.qq.com/agent-interface`（仅弹出一次，需妥善保存，支持撤销重发）

### 1.2 目标

1. `second-brain-hub` 的八条场景在 **Obsidian、Markdown 文件夹、ima** 三种后端下都能运行（ima 存在能力缺口的场景允许局部降级，不静默跳步）。
2. 支持 **双后端模式**：Obsidian 为主、ima 为镜像/同步目标（反之亦然），一次保存两端可查。
3. 不破坏现有架构契约：`route-contracts.json` / `capability-contracts.json` / `dependencies.json` / 写入前置 / SETUP.md 唯一事实源原则全部保留，只做受控扩展。
4. API Key 不落 Git、不出现在对话回执中。

### 1.3 非目标

- 不做 ima → Obsidian 的全量历史数据迁移工具（后续单独立项）。
- 不绕过 ima-skills 直接调用 ima OpenAPI（统一走官方 Skill 包，便于升级与权限治理）。
- 不改动八条场景的意图路由与方法论模块（PARA、渐进式总结等方法论与后端无关，保持原样）。

---

## 2. 现状架构盘点（扩展点定位）

```
用户 → SKILL.md（意图路由，8 场景）
        → route-contracts.json（场景步骤链 + 前置门控）
        → capability-contracts.json（能力契约：实现/降级/输入输出/门控/副作用）
        → dependencies.json（外部 Skill 依赖 + fallback）
        → SETUP.md（唯一初始化 SOP，storage_mode: obsidian | markdown）
        → hub-state.json（运行态配置：vault_path、preferences）
```

关键观察：

1. **唯一的存储耦合点**是能力 `obsidian-cli`。场景步骤里写死了 `obsidian-cli/search`、`obsidian-cli/create` 等步骤 ID，共出现 14 处（8 个场景）。
2. `storage_mode` 已有 `obsidian | markdown` 两值，说明"多后端"在配置层已有先例，缺的是**能力层的后端抽象**。
3. `capability-contracts.json` 已为每个能力声明 `fallback_implementation` 和 `failure_mode`，ima 接入可以完全复用这套降级协议。
4. 写入安全依赖 `write_preflight` 的 `target-path` 门控 + `path_safety` 规则——**这套规则是文件系统语义，ima 无路径概念，需要平行设计一套 API 语义的安全规则**。
5. `tests/hub/` 已有 intent-routing / route-contract-cases / dependency-cases / gate-cases 测试基座，新后端必须同步补用例。

---

## 3. 核心设计决策

### 决策 1：引入存储后端抽象 `kb-store`，而非在场景里并列 ima 步骤

**问题**：ima 是云端 API 知识库，没有文件路径、没有目录移动、没有"编辑某一行"。如果把 ima 步骤直接塞进场景步骤链，8 个场景都要写两套步骤，契约会失控。

**方案**：在 `capability-contracts.json` 新增抽象能力 `kb-store`，输入输出与现有 `obsidian-cli` 完全对齐（`search_results` / `read_content` / `write_receipt`），内部按 `hub-state.json` 的后端配置**路由到具体提供者**：

```
kb-store（抽象能力，场景唯一引用）
 ├─ provider: obsidian-cli   → 本地 Vault（现有，行为不变）
 ├─ provider: filesystem     → 普通 Markdown 文件夹（现有降级路径，转正为一等 provider）
 └─ provider: ima-skills     → ima OpenAPI（新增）
```

场景步骤 ID 由 `obsidian-cli/*` 改为 `kb-store/*`（见 §5 迁移策略，保留别名兼容）。

**备选方案（已否决）**：保留 `obsidian-cli` 步骤 ID、让其内部转发 ima。理由否决：命名说谎，排障与测试时无法区分"走了哪个后端"，违背契约可审计原则。

### 决策 2：ima 的能力缺口显式建模为 `partial`，不伪造等价操作

ima-skills 当前能力 vs 场景需求对照：

| 场景步骤 | obsidian-cli 操作 | ima-skills 对应 | 缺口处理 |
|---|---|---|---|
| 灵感速记 / 保存外源 / 回顾 → create | 新建 .md 文件 | 新建笔记 / 网页加入知识库 | ✅ 可映射 |
| 探索查询 / 创作 → search | 全文搜索 | 知识库检索、笔记搜索 | ✅ 可映射（返回结构需适配） |
| 提炼加工 → read + edit | 读文件、原地改写 | 读笔记 + **追加**笔记 | ⚠️ 无原地编辑：改为"追加提炼层"（见 §4.3） |
| 收件箱 → list + move-or-delete | 列目录、移动/删除 | 知识库列表 | ❌ 无移动/删除：ima 单后端模式下该场景 `blocked`；双后端模式仅在本地端执行 |
| 保存外源 → 网页入库 | defuddle + 渲染 md 写入 | **可直接将 URL 加入知识库** | ✅ ima 原生更优，作为该后端的快捷路径 |

缺口一律走契约已有的 `failure_mode` / `blocked` 语义，向前端报告"此后端不支持该步骤"，**禁止用追加伪造改写、用新建伪造移动**。

### 决策 3：双后端采用「主-镜像」而非「对等双向同步」

第一版不做双向冲突合并（ima 无修改时间戳之外的并发控制，双向同步必然丢数据）。配置为：

- `primary`：唯一写入权威端，所有场景读默认走主端。
- `mirror`（可选）：写入主端成功后，按 `sync_mode` 追加投递到镜像端。
  - `off`：不同步（默认）
  - `mirror-on-write`：每次写入后同步（灵感、外源保存、回顾产物）
  - `manual`：仅用户显式说"同步到 ima / 同步到本地"时执行
- 镜像失败**不阻塞**主端写入：记入 `hub-state.json` 的 `sync_outbox` 待重投队列，下次任意场景触发时提示重试。

### 决策 4：PARA → ima 的映射用「知识库」承载

ima 没有目录层级，映射方案：

- 初始化时在 ima 侧确认/建立 5 个知识库：`📥 收件箱`、`📂 项目`、`📂 领域`、`📂 资源`、`📦 存档`（复用现有 PARA 命名，用户无新概念负担）。
- `para-system` 模块输出的 `target_folder` 不变；`kb-store` 的 ima provider 负责把 `target_folder` 翻译成 `kb_id`（映射表存 `hub-state.json`，见 §4.2）。
- 笔记标题规范沿用 obsidian-markdown 渲染结果的第一行标题，frontmatter 中 vault 专属字段（wikilinks 等）在 ima 端降级为正文末尾的纯文本标签行。

---

## 4. 详细设计

### 4.1 `capability-contracts.json` 变更

新增抽象能力（schema_version 升至 3.1）：

```json
{
  "id": "kb-store",
  "module": "tools",
  "implementation": {
    "type": "provider-router",
    "resolve_by": "hub-state.backends.primary",
    "providers": {
      "obsidian":  { "type": "skill", "name": "obsidian-cli" },
      "markdown":  { "type": "protocol", "path": "references/dependency-resolution.md", "id": "direct-vault-filesystem" },
      "ima":       { "type": "skill", "name": "ima-skills" }
    }
  },
  "inputs":  ["backend", "operation", "target_folder_or_kb", "target_path_or_query", "content"],
  "outputs": ["search_results", "read_content", "write_receipt"],
  "gates": ["backend-resolved-before-operation"],
  "failure_mode": "主后端不可用时按 dependencies.json 降级；镜像后端失败仅记录 sync_outbox，不阻断主流程。",
  "side_effects": ["vault_read", "vault_write", "ima_read", "ima_write"]
}
```

新增 ima 专属安全块（与 `path_safety` 平行）：

```json
"api_scope_safety": {
  "enforce": true,
  "applies_to": ["ima"],
  "rules": [
    "ima 写入目标必须落在 hub-state.backends.ima.kb_mapping 已确认的知识库内",
    "禁止调用映射表外的 kb_id；用户临时指定新知识库时需显式确认后加入映射表",
    "API Key 只从环境变量或本地凭证文件读取，禁止写入 hub-state.json 明文、禁止出现在回执与日志",
    "ima 端无删除能力：任何删除意图在 ima 侧一律 blocked 并明示"
  ],
  "failure_mode": "目标知识库未确认或越权时阻止操作并报告越界"
}
```

现有 `obsidian-cli` 能力条目**保留不动**（作为 provider 被引用），`defuddle`、方法论模块全部不变。

### 4.2 `hub-state.json` 扩展

```json
{
  "version": "1.3",
  "backends": {
    "primary": "obsidian",
    "mirror": "ima",
    "sync_mode": "mirror-on-write",
    "ima": {
      "credential_ref": "env:IMA_API_KEY",
      "default_note_style": "append",
      "kb_mapping": {
        "📥 收件箱": "kb_xxxx01",
        "📂 项目":   "kb_xxxx02",
        "📂 领域":   "kb_xxxx03",
        "📂 资源":   "kb_xxxx04",
        "📦 存档":   "kb_xxxx05"
      }
    }
  },
  "sync_outbox": [],
  "preferences": { "storage_mode": "obsidian", "...": "保持向后兼容，由 backends.primary 派生" }
}
```

- `preferences.storage_mode` 保留（旧逻辑与测试不炸），初始化时由 `backends.primary` 回填。
- `sync_outbox` 条目：`{ "op": "create", "payload_ref": "...", "target": "ima", "failed_at": "...", "attempts": 1 }`。

### 4.3 各后端语义适配（provider 内部职责）

| 抽象操作 | obsidian / markdown | ima |
|---|---|---|
| `create` | 写 .md 到 target_path | 新建笔记到映射知识库；外源场景优先用「网页加入知识库」原生能力，同时把提炼后的 md 作为笔记正文 |
| `search` | 文件名 + 全文 | 知识库检索 + 笔记搜索，结果统一规整为 `{title, ref, excerpt, backend}` |
| `read` | 读文件 | 读笔记正文 |
| `edit`（提炼回写） | 原地改写 | **追加模式**：在原笔记末尾追加 `## L2 提炼（2026-07-29）` 分段；`write_receipt` 标注 `append_only=true` |
| `list` | 列目录 | 列知识库（收件箱场景在 ima 单后端下 blocked） |
| `move-or-delete` | 移动/删除文件 | `blocked`，failure_mode 明示 |

### 4.4 SETUP.md 扩展（唯一初始化 SOP 不变原则）

在第 2 步「选存储形态」增加选项，走**路线 D**：

> "你的笔记想用 **Obsidian**、**普通文件夹**，还是 **腾讯 ima 知识库** 管理？也可以选 Obsidian + ima 双备份。"

路线 D 步骤：
1. 引导用户打开 `https://ima.qq.com/agent-interface` 获取 API Key（提醒仅显示一次），由用户粘贴，Agent 写入环境变量/本地凭证文件（**不进 hub-state.json 明文、不进 Git**）。
2. 安装 ima-skills 包并自检连通性：调用「知识库列表」返回成功即通过。
3. 询问使用已有知识库还是新建；按 PARA 五库建立/确认 `kb_mapping`。
4. 写入 `backends` 配置；若用户选双后端，追问一句"哪边是主？"，默认 Obsidian 为主、ima 为镜像、`sync_mode=mirror-on-write`。
5. 第 5 步验证标准追加：ima 连通性 + kb_mapping 五库全部可解析。

`workflow-onboarding.md` 不动（它只负责暂存与恢复，SOP 内部扩展对适配层透明）。

### 4.5 `dependencies.json` 追加

```json
{
  "name": "ima-skills",
  "source": { "url": "https://app-dl.ima.qq.com/skills/ima-skills-1.1.2.zip" },
  "visibility": "hidden",
  "install_with_parent": false,
  "runtime_required": false,
  "fallback": "local-backend-only-with-sync-outbox",
  "note": "仅当 backends 配置包含 ima 时才需要；缺失时 ima 相关操作 blocked，本地后端不受影响"
}
```

`install_with_parent: false` 是关键——不用 ima 的用户不应被强制安装。

### 4.6 `route-contracts.json` 迁移策略

1. 全部场景的 `obsidian-cli/*` 步骤 ID 改为 `kb-store/*`（14 处），`schema_version` 升至 3.1。
2. 兼容期：加载契约时把 `obsidian-cli/*` 别名映射到 `kb-store/*`，外部若有引用不炸；一个版本后移除别名。
3. 场景新增可选字段 `backend_support`：

```json
{ "id": "inbox", "backend_support": { "obsidian": "full", "markdown": "full", "ima": "blocked" } }
{ "id": "distill", "backend_support": { "obsidian": "full", "markdown": "full", "ima": "partial" } }
```

`blocked` / `partial` 时地图卡直接显示该后端的能力边界，符合"不静默跳步"原则。

### 4.7 测试扩展（tests/hub/）

| 测试文件 | 新增用例 |
|---|---|
| `route-contract-cases.json` | 每个场景 × 3 后端的步骤链合法性；`obsidian-cli/*` 别名解析 |
| `dependency-cases.json` | ima-skills 缺失 / API Key 失效 / 网络超时 → 本地后端不受影响、镜像失败进 outbox |
| `gate-cases.json` | api_scope_safety：kb_id 越界拦截、Key 不落明文、ima 端删除意图 blocked |
| `intent-routing.json` | "同步到 ima"、"保存到我的知识库（ima 配置下）"等语料的意图与后端判定 |
| 新增 `backend-adapter-cases.json` | PARA→kb_id 翻译、edit→append 语义、搜索结果结构归一化 |

ima API 一律 mock，测试不依赖真实 Key。

---

## 5. 里程碑拆解

| 阶段 | 范围 | 验收标准 |
|---|---|---|
| **M1 · 抽象先行**（不改用户可见行为） | 引入 `kb-store` 抽象 + 别名兼容 + storage_mode 既有双值跑通；契约 schema 3.1 | 现有全部测试通过；Obsidian/Markdown 行为零回归 |
| **M2 · ima 单点接通** | dependencies + SETUP 路线 D + query / external-save / inspiration 三场景的 ima provider | ima 单后端下：能初始化、能存网页、能记灵感、能搜索；凭证明文零落盘 |
| **M3 · 双后端镜像** | backends.primary/mirror + sync_outbox + mirror-on-write | 双写成功两端可查；镜像失败可重投且不阻断主写入 |
| **M4 · 全场景收口** | distill 追加模式、review/create 全通、inbox 的 ima blocked 提示、测试补齐 | `backend_support` 矩阵全绿（full/partial/blocked 均按预期） |

M1 可以独立先合并，降低后续每一步的改动面。

---

## 6. 风险与开放问题

1. **ima-skills 版本漂移**：1.1.2 之后能力可能扩充（官方预告知识库 skill 持续迭代）。依赖中固定版本 + 升级时重跑 dependency-cases。
2. **API 配额与限流**：未知。镜像同步失败进 outbox 的设计天然吸收偶发限流；持续失败时提示用户检查 Key 与额度。
3. **追加式提炼的可读性**：ima 笔记会越追越长。后续若官方开放改写接口，`edit` 语义可平滑切回原地更新（`default_note_style` 配置已预留）。
4. **开放问题**：ima 知识库检索能否按"知识库内"过滤？搜索结果是否带可回链的 note id？→ M2 开始时先用真实 Key 做一次只读探测，结论回填 §4.3 适配表。
5. **隐私边界**：双后端意味着笔记明文上云（腾讯侧）。SETUP 路线 D 必须用一句话告知："选 ima 后笔记内容会上传到腾讯服务器"，用户确认才继续。

---

## 附：关键外部事实来源

- ima-skills 能力清单与安装方式：SkillHub 页面（https://www.skillhub.cn/skills/ima-skills）及用户实测文章（xmsumi.com，2026-07-24）
- ima 官方能力描述「查、读、写」：腾讯云开发者社区 imaCopilot 文章（2026-03-31）
- API Key 获取入口：https://ima.qq.com/agent-interface
