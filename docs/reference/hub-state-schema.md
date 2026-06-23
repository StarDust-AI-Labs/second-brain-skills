# Hub State Schema

- 当前版本: 1.1
- 权威项目级状态文件: `.claude/hub-state.json`
- Vault 运行态状态文件: `{vault_path}/.obsidian/hub-state.json`
- Legacy fallback: `.Codex/hub-state.json`

---

## 1. 状态文件分工

### 项目级状态

`.claude/hub-state.json` 是 Hub 的权威配置来源，用于保存跨会话偏好和 Vault 定位信息。

它应该提交到当前项目仓库，方便 Codex/Claude 在同一项目上下文中读取。

### Vault 运行态状态

`{vault_path}/.obsidian/hub-state.json` 是 Vault 内运行记录，用于保存最近操作、收件箱运行态、自动化任务状态等。

如果不存在，Hub 可以根据项目级状态创建。创建时不要覆盖用户已有 Obsidian 配置。

### Legacy fallback

`.Codex/hub-state.json` 仅用于兼容旧文档或旧工作流。若 `.claude/hub-state.json` 与 `.Codex/hub-state.json` 同时存在，必须以 `.claude/hub-state.json` 为准。

---

## 2. 顶层字段

```json
{
  "version": "1.1",
  "updated": "2026-06-17",
  "active_projects": [],
  "inbox_count": 0,
  "inbox_last_cleared": null,
  "active_bridges": [],
  "last_operations": [],
  "preferences": {},
  "twelve_problems": []
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `version` | string | 是 | `"1.1"` | 状态 schema 版本。 |
| `updated` | string | 是 | 当前日期 | 最近一次修改日期，格式 `YYYY-MM-DD`。 |
| `active_projects` | string[] | 是 | `[]` | 当前可选择的活跃项目。 |
| `inbox_count` | number | 否 | `0` | 最近一次记录的收件箱数量。 |
| `inbox_last_cleared` | string/null | 否 | `null` | 最近清空收件箱日期。 |
| `active_bridges` | object[] | 否 | `[]` | 创作/项目的海明威之桥。 |
| `last_operations` | object[] | 是 | `[]` | 最近 Hub 操作记录，建议最多保留 20 条。 |
| `preferences` | object | 是 | `{}` | 用户偏好和 Vault 定位。 |
| `twelve_problems` | object[]/string[] | 是 | `[]` | 用户的 12 个兴趣问题。 |

---

## 3. preferences 字段

```json
{
  "vault_path": "D:\\second-brain\\第二大脑",
  "vault_name": "第二大脑",
  "default_distill_level": 1,
  "weekly_review_day": "friday",
  "inbox_warning_threshold": 15,
  "auto_distill_l2_on_revisit": true,
  "auto_distill_l3_on_create": true
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `vault_path` | string/null | 是 | `null` | Obsidian Vault 绝对路径。为空时 Hub 必须先询问用户。 |
| `vault_name` | string/null | 是 | `null` | Obsidian Vault 名称，用于 Obsidian URI 和 CLI。 |
| `default_distill_level` | number | 是 | `1` | 外源保存默认提炼层级。 |
| `weekly_review_day` | string | 否 | `"friday"` | 周回顾偏好日期。 |
| `inbox_warning_threshold` | number | 否 | `15` | 收件箱积压提醒阈值。 |
| `auto_distill_l2_on_revisit` | boolean | 否 | `true` | 重新访问 L1 笔记时是否自动建议 L2。 |
| `auto_distill_l3_on_create` | boolean | 否 | `true` | 创作时是否自动建议把 L2 素材推进到 L3。 |

---

## 4. last_operations 条目

推荐格式:

```json
{
  "action": "capture_external",
  "path": "📂 项目/第二大脑体系搭建/Skills规范与设计模式_2026-06-14.md",
  "time": "2026-06-14",
  "source": "https://example.com/article",
  "distill_level": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | 是 | 操作类型，如 `capture_inspiration`、`capture_external`、`inbox_batch_process`、`weekly_review`。 |
| `path` | string | 否 | 目标笔记或文件夹路径。 |
| `time` | string | 是 | 操作时间，建议 `YYYY-MM-DD` 或 ISO 时间。 |
| `source` | string | 否 | URL、语音、手动输入等来源。 |
| `distill_level` | number | 否 | 操作后提炼层级。 |
| `count` | number | 否 | 批量操作数量。 |
| `kept` | number | 否 | 批量处理保留数量。 |
| `deleted` | number | 否 | 批量处理移入待删除或 trash 的数量。 |

---

## 5. active_bridges 条目

推荐格式:

```json
{
  "project": "AI视频创作",
  "path": "📂 项目/AI视频创作/02-大纲.md",
  "next_action": "补齐第三节案例",
  "state": "已有素材清单和初版大纲",
  "updated": "2026-06-23"
}
```

`active_bridges` 用于记录未完成项目的下次继续点。Hub 在创作启动、项目搁置、周回顾时应优先读取它。

---

## 6. twelve_problems 条目

最小格式可以是字符串:

```json
[
  "如何让 AI 帮我更稳定地产出创意作品？"
]
```

推荐格式是对象:

```json
[
  {
    "id": "Q01",
    "question": "如何让 AI 帮我更稳定地产出创意作品？",
    "tags": ["AI创作", "工作流"],
    "status": "active"
  }
]
```

保存外源和探索查询时，Hub 可以把匹配结果写入笔记 frontmatter 的 `related_problems` 字段。

---

## 7. 迁移规则

### 从 1.0 到 1.1

若旧状态缺少以下字段，Hub 可以自动补默认值:

```json
{
  "inbox_count": 0,
  "inbox_last_cleared": null,
  "active_bridges": [],
  "preferences": {
    "auto_distill_l2_on_revisit": true,
    "auto_distill_l3_on_create": true
  }
}
```

迁移时必须保留:

- `active_projects`
- `last_operations`
- `preferences.vault_path`
- `preferences.vault_name`
- `twelve_problems`

---

## 8. 安全约定

- `vault_path` 是本地路径，可以提交到个人项目仓库；如果未来公开发布模板，应改为示例值或 `.example` 文件。
- Hub 不应在没有用户确认时批量移动或删除 Vault 内容。
- 删除操作应优先移动到 `.trash` 或 `📂 存档/_待删除/`，不直接永久删除。
- 状态文件 JSON 必须保持可解析；修改后应运行:

```powershell
Get-Content -Raw -Encoding UTF8 .claude\hub-state.json | ConvertFrom-Json | Out-Null
```
