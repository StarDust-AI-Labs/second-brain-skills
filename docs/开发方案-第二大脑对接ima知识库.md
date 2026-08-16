# 开发方案：second-brain-hub 对接腾讯 ima 知识库

- 版本：v1.0（待审核）
- 日期：2026-08-16
- 状态：**待用户审核，审核通过后才开始实施**
- 上游设计稿：[特性方案-第二大脑对接ima知识库.md](特性方案-第二大脑对接ima知识库.md)（v0.1，2026-07-29）
- 需求来源：2026-07-25 记录——second-brain-hub 以上架商家身份入驻腾讯 SkillHub 生态，必须对接腾讯 ima 知识库（读取/写入/同步个人知识）才能立住生态位

---

## 0. 一页结论（先看这里）

| 问题 | 结论 |
|---|---|
| 需求是否明确？ | ✅ 明确。记忆库与 docs 双重确认，是 SkillHub 生态卡位的关键特性 |
| 既有设计稿是否可行？ | ✅ **总体可行**。四个核心设计决策（kb-store 抽象 / 缺口显式建模 / 主-镜像模式 / PARA→知识库映射）与现有契约体系完全兼容，无架构冲突 |
| 需要修正什么？ | ⚠️ 三处：① ima-skills 版本基线已从 1.1.2 漂移到 **1.1.9**，能力清单需重新核实；② route-contracts 迁移面实际为 **35 处**（设计稿只算了 14 处）；③ 新增 M0 事实核查阶段先于一切开发 |
| 是否建议实施？ | ✅ 建议实施，按 M0→M1→M2→M3→M4 五阶段推进，M1 可独立合并，每阶段不破坏现有行为 |
| 最大风险 | ima OpenAPI 无公开文档、能力靠版本漂移；用 M0 探测 + mock 测试 + outbox 降级三重防护 |

---

## 1. 评估部分

### 1.1 需求核实

| 来源 | 内容 | 时间 |
|---|---|---|
| 记忆库 `ima-knowledge-base-integration` | 第二大脑 skill 必须对接 ima 知识库，融入 SkillHub 生态；方向：调研 API/MCP 接入、设计 Obsidian↔ima 桥接层 | 2026-07-25 |
| `docs/特性方案-第二大脑对接ima知识库.md` | 完整设计稿 v0.1：kb-store 抽象、双后端主-镜像、PARA 五库映射、api_scope_safety 安全块 | 2026-07-29 |
| `docs/Skill优化迭代记录.md` | 无后续 ima 相关条目——设计稿之后无人改动过该需求 | — |

**结论：需求真实、未过时、未实施（代码中无任何 ima 实现，grep 命中均为子串误报）。**

### 1.2 架构现状核对（设计稿假设 vs 代码实况）

| 设计稿假设 | 代码实况 | 判定 |
|---|---|---|
| `capability-contracts.json` schema 3.0，`obsidian-cli` 是唯一存储耦合点，带 `path_safety` | ✅ 完全一致（schema 3.0；`obsidian-cli` 条目含 `path_safety` 四条规则 + `fallback_implementation: direct-vault-filesystem`） | 假设成立 |
| `storage_mode` 已有 `obsidian \| markdown` 双值先例 | ✅ `hub-state.example.json` v1.2 中 `preferences.storage_mode` 存在 | 假设成立 |
| `route-contracts.json` 中 `obsidian-cli/*` 步骤共 **14 处**（8 场景） | ❌ **实际 35 处**：step_order/required_steps/progress_map.source_steps 均引用 | **迁移面扩大 2.5 倍，必须保留别名兼容** |
| `dependencies.json` 支持 hidden + install_with_parent + fallback 声明 | ✅ 现有 5 个依赖全部用此结构，ima-skills 追加一条即可 | 假设成立 |
| SETUP.md 是唯一初始化 SOP，现有路线 A/B/C | ✅ 三路线结构清晰，追加路线 D 无冲突 | 假设成立 |
| 依赖降级协议 primary/fallback/blocked 可复用 | ✅ `dependency-resolution.md` 协议完整，ima 缺失时走 blocked 即可 | 假设成立 |
| `tests/hub/` 有 dependency-cases / onboarding-cases 测试基座 | ✅ 存在，结构简单可扩展 | 假设成立 |

### 1.3 ima-skills 生态调研更新（2026-08-16 实测调研）

设计稿写于 2026-07-29，以 ima-skills **1.1.2** 为基线。截至本方案撰写时的最新公开事实：

| 事实 | 对方案的影响 |
|---|---|
| 官方下载已指向 **ima-skills-1.1.9.zip**（`app-dl.ima.qq.com/skills/ima-skills-1.1.9.zip`），SkillHub 页面迁移至 `skillhub.cn/skills/tencent-adm/ima-skills` | 版本基线必须更新；依赖声明不写死 1.1.2 |
| 版本演进：1.1.2（知识库导入/查询、笔记查询/创建/修改）→ 1.1.3（+笔记列表、排序）→ 4 月下旬（知识库内容全量获取）→ 1.1.9（changelog 未公开索引） | 能力清单**不能凭旧文章推断**，M0 必须解包 1.1.9 实物核对 |
| 各版本均**未见删除笔记/删除知识库对象的 API** | "ima 端删除一律 blocked" 决策维持 |
| 1.1.2 时期有文章提到笔记"修改"能力，但未明确是原地改写还是追加 | **关键开放问题**：决定 distill 场景用 append 还是原地 edit，M0 必须核实 |
| 凭证：`ima.qq.com/agent-interface` 获取 Client ID + API Key；也可在 ima 桌面端 → 设置 → 开发者选项申请；社区惯例存 `~/.config/ima` 或环境变量 | 与设计稿凭证安全要求一致，落地方式确认可行 |
| 存在 Obsidian 社区插件 **ima.copilot Sync**：ima→Obsidian 单向增量同步、图片/文件本地化 | 可选补充：作为用户主导的"读方向"桥（ima 内容拉回本地库），不替代 agent 驱动的 kb-store；列为可选项交用户决策 |

### 1.4 第一性原理可行性检验

回到最底层问题："第二大脑的价值 = 知识在需要时可被找到并被加工"。ima 对接要成立，只需回答三问：

1. **能写入吗？** ✅ ima-skills 支持新建笔记/上传文件/网页入库——灵感、外源保存、回顾产物三个写入场景有落点。
2. **能找回吗？** ✅ 支持知识库检索 + 笔记搜索——查询、创作取素材场景有落点。
3. **加工不了的部分会骗人吗？** 这是关键。ima 无删除、（大概率）无原地编辑、无目录移动。只要**显式声明能力边界**（`backend_support: full/partial/blocked`）而不是伪造等价操作，就不会破坏"不静默跳步"的架构铁律。设计稿的 `partial/blocked` 建模正是答案。

**结论：可行性成立。ima 的能力缺口不阻塞核心价值（存得进、找得到），只影响少数管理型操作（移动/删除/原地提炼），且都有诚实的降级路径。**

---

## 2. 开发方案

### 2.0 总体策略

完全采纳设计稿 v0.1 的四个核心设计决策（不再重复论证），在其上做三处修正：

- **修正 1**：新增 **M0 事实核查阶段**——下载 ima-skills-1.1.9 实物解包，核对真实能力清单；有条件时用真实 Key 做只读探测。M0 的产出是后续所有开发的事实基线。
- **修正 2**：route-contracts 迁移按 **35 处引用**规划，强制保留 `obsidian-cli/*` → `kb-store/*` 别名至少一个版本。
- **修正 3**：dependencies.json 中 ima-skills 源不写死 1.1.2 版本号，改记"官方下载页 + 解包后实际版本"，并在 M0 产出能力快照文件。

### 2.1 里程碑拆解

#### M0 · 事实核查（预计 0.5～1 天，不改任何现有代码）

| 事项 | 内容 |
|---|---|
| 任务 | ① 下载 `ima-skills-1.1.9.zip` 解包，通读其 SKILL.md 与全部能力声明；② 产出 `docs/reference/ima-skills-1.1.9-能力快照.md`：逐条列出笔记/知识库两模块的操作名、输入、输出、是否支持原地编辑、是否支持删除、搜索是否可按知识库过滤、结果是否带 note id；③ 若用户提供 API Key：执行**只读**探测（知识库列表 + 一次搜索），验证返回结构，Key 只进环境变量不落任何文件 |
| 交付物 | 能力快照文档 + 更新后的 §4.3 语义适配表（回填设计稿开放问题 §6.4） |
| 决策点 | **若 1.1.9 已支持原地编辑** → distill 场景在 ima 端用原地 edit；否则维持设计稿的 append 追加模式。**此决策影响 M4，不影响 M1/M2/M3 启动** |
| 退出标准 | 能力快照经用户确认；所有"未知"项要么有实测结论、要么显式标注为 blocked 处理 |

#### M1 · 抽象先行（预计 1～2 天，零用户可见行为变化）

| 事项 | 内容 |
|---|---|
| 任务 | ① `capability-contracts.json` 新增 `kb-store` 抽象能力（provider-router：obsidian / markdown / ima 三 provider，ima 先占位为 `blocked`）+ `api_scope_safety` 安全块，schema → 3.1；② `route-contracts.json` 全部 35 处 `obsidian-cli/*` 改为 `kb-store/*`，schema → 3.1，加载层保留 `obsidian-cli/*` 别名映射；③ 每场景增加 `backend_support` 字段（本阶段 obsidian/markdown 全 full，ima 全 blocked）；④ `hub-state.example.json` 升 v1.3，加 `backends` 结构（`sync_mode: off` 默认，行为与现在完全一致）；⑤ 测试基座同步更新 |
| 涉及文件 | `capability-contracts.json` `route-contracts.json` `hub-state.example.json` `tests/hub/*` |
| 验收标准 | **现有全部测试零回归**；别名解析测试通过；Obsidian / Markdown 双模式行为逐一回归无变化 |
| 独立性 | 本阶段可单独合并到 main，即使 ima 后续不做，抽象层也无害 |

#### M2 · ima 单点接通（预计 2～3 天）

| 事项 | 内容 |
|---|---|
| 任务 | ① `dependencies.json` 追加 ima-skills（hidden、`install_with_parent: false`、fallback=`local-backend-only-with-sync-outbox`）；② SETUP.md 第 2 步增加第四选项 + **路线 D**（获取 Key → 装 ima-skills → 连通自检 → 建/确认 PARA 五知识库 → 写 kb_mapping → 隐私告知"笔记将上传腾讯服务器"并征得确认）；③ ima provider 实现三个场景：`inspiration`（新建笔记）、`external-save`（优先用 ima 原生"网页加入知识库"+ 提炼 md 作笔记正文）、`query`（知识库检索 + 笔记搜索，结果归一化为 `{title, ref, excerpt, backend}`）；④ 凭证安全：Key 只从环境变量/本地凭证文件读取，禁止进 hub-state.json、回执、日志、Git |
| 涉及文件 | `dependencies.json` `SETUP.md` `capability-contracts.json`（ima provider 解除 blocked）`tests/hub/dependency-cases.json` 等 |
| 验收标准 | ima 单后端下：能完成初始化、记灵感、存网页、搜索；凭证明文零落盘；ima-skills 缺失时本地后端完全不受影响 |

#### M3 · 双后端镜像（预计 2 天）

| 事项 | 内容 |
|---|---|
| 任务 | ① `backends.primary/mirror` + `sync_mode`（off / mirror-on-write / manual）生效；② 写入主端成功后按模式投递镜像端；③ 镜像失败不阻塞主写入，失败进 `sync_outbox` 队列（记 op、payload_ref、target、failed_at、attempts），下次任意场景触发时提示重试；④ 支持"同步到 ima / 同步到本地"显式指令（manual 模式） |
| 验收标准 | 双写成功两端可查；杀掉镜像端（mock 失败）主写入照常成功且 outbox 有记录；重投成功后 outbox 清空 |

#### M4 · 全场景收口（预计 2～3 天）

| 事项 | 内容 |
|---|---|
| 任务 | ① distill 场景按 M0 结论实现 append 或原地 edit（`write_receipt` 标注 `append_only`）；② review / create 场景 ima 端打通；③ inbox 场景 ima 单后端下 blocked 明示（地图卡显示能力边界），双后端时仅本地端执行；④ `backend_support` 矩阵更新为最终值；⑤ 新增 `tests/hub/backend-adapter-cases.json`（PARA→kb_id 翻译、edit 语义、搜索结果归一化、kb_id 越界拦截、Key 不落明文、ima 删除意图 blocked）；⑥ ima API 一律 mock，测试不依赖真实 Key |
| 验收标准 | `backend_support` 矩阵 8 场景 × 3 后端全部按预期（full/partial/blocked）；新增测试全绿；README 更新提及 ima 支持 |

**总工期估计：8～11 个工作日**（M0 的 Key 探测依赖用户提供 Key，若无法提供则 M0 只产出静态能力快照，相关开放问题顺延到 M2 开头验证）。

### 2.2 测试策略

| 测试文件 | 新增内容 |
|---|---|
| `route-contract-cases.json` | 每场景 × 3 后端步骤链合法性；`obsidian-cli/*` 别名解析 |
| `dependency-cases.json` | ima-skills 缺失 / Key 失效 / 超时 → 本地后端不受影响、镜像失败进 outbox |
| `gate-cases.json` | api_scope_safety：kb_id 越界拦截、Key 不落明文、ima 端删除 blocked |
| `intent-routing.json` | "同步到 ima"、ima 配置下"保存到我的知识库"等语料 |
| 新增 `backend-adapter-cases.json` | PARA→kb_id、edit→append、搜索结果归一化 |

原则：**ima API 全部 mock**；真实 Key 只在 M0/M2 人工冒烟时用，不进 CI。

### 2.3 风险与对策

| 风险 | 概率 | 对策 |
|---|---|---|
| ima-skills 继续版本漂移（1.1.9 之后） | 高 | 依赖声明不锁死版本；M0 能力快照作为回归基线；每次升级重跑 dependency-cases |
| 1.1.9 能力与快照不符（文档滞后于实物） | 中 | M0 以解包实物为准，不信二手文章 |
| API 配额/限流未知 | 中 | outbox 设计天然吸收偶发失败；持续失败提示用户查 Key 与额度 |
| 追加式笔记越写越长（若维持 append） | 中 | 预留 `default_note_style` 配置，官方开放改写后可切回原地更新 |
| 隐私：双后端 = 笔记明文上云 | 必须管控 | SETUP 路线 D 强制一句话告知 + 用户确认才继续；默认 sync_mode=off |
| 35 处迁移引入回归 | 中 | M1 别名兼容 + 全量旧测试通过作为合并门槛 |

### 2.4 明确不做（本方案范围外）

- ima → Obsidian 全量历史迁移工具（单独立项）
- 绕过 ima-skills 直连 ima OpenAPI
- 双向对等同步与冲突合并（第一版只做主-镜像）
- 方法论模块（PARA、渐进式总结等）任何改动

---

## 3. 需要你审核决策的事项

| # | 决策项 | 建议 |
|---|---|---|
| 1 | 是否按 M0→M4 顺序实施？M1 可先行独立合并 | ✅ 建议批准 |
| 2 | M0 只读探测需要你提供 ima API Key（`ima.qq.com/agent-interface` 获取，仅显示一次）。不提供则 M0 只做静态解包 | 建议提供，收益大 |
| 3 | 是否把 Obsidian 插件 ima.copilot Sync（ima→本地单向增量同步）纳入后续可选增强？ | 建议列为 v2 可选项，本期不做 |
| 4 | SkillHub 发布节奏：特性合入 + 测试稳定后再重新打包发布（与记忆中"发布暂缓"决策一致） | 维持暂缓，M4 后评估 |
