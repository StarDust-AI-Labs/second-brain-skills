# 依赖解析与降级协议

## 目标

SkillHub 只公开 `second-brain-hub`。安装器读取 `dependencies.json`，将五个 `visibility=hidden` 的工具 Skill 与父 Skill 同步安装。隐藏只影响商店展示，不影响 Agent 在运行时发现依赖。

依赖安装失败或用户手动只安装 Hub 时，不得仅因工具 Skill 缺失就停止整个 Hub。每次执行工具能力前，将实现解析为 `primary`、`fallback` 或 `blocked`。

## 解析顺序

1. 已安装目标工具 Skill：使用 `primary`。
2. 未安装但存在安全等价能力：使用 `fallback`，记录原因、替代实现和能力差异。
3. 没有安全等价能力：记录 `blocked`，只阻塞当前能力或当前场景，不影响无关场景。

## 降级映射

| 依赖 | 首选实现 | 缺失时降级 |
|---|---|---|
| `obsidian-cli` | Obsidian CLI | 在已确认的 `vault_path` 内直接搜索、读取和操作文件 |
| `obsidian-markdown` | Obsidian Markdown Skill | 按 `writing-pipeline.md` 直接生成 frontmatter、wikilink、callout 和正文 |
| `defuddle` | Defuddle Skill | 使用当前环境已有网页读取能力；仍不可用时请用户粘贴正文 |
| `json-canvas` | JSON Canvas Skill | 已知 JSON Canvas 结构时直接编辑 `.canvas`；结构不确定时阻塞该操作 |
| `obsidian-bases` | Obsidian Bases Skill | 已知 Bases 结构时直接编辑 `.base`；结构不确定时阻塞该操作 |

## 直接 Vault 文件操作

直接文件系统降级必须满足：

1. `vault_path` 和 `vault_name` 已确认。
2. 将目标解析为绝对路径，并验证目标仍位于 `vault_path` 内。
3. 搜索与读取保持只读；创建、更新、移动和删除必须通过原有写入前置。
4. 创建或更新 Markdown 时仍需生成完整 frontmatter，并检查 wikilink、callout 和 UTF-8 编码。
5. 移动前确认目标目录；删除前逐项取得明确确认，不接受“全部删掉且不用确认”绕过门控。
6. 写入后返回实际路径和文件系统回执，不得伪装成 Obsidian CLI 回执。

<HARD-GATE id="fallback-vault-boundary">
未确认 Vault 配置，或目标绝对路径不在 `vault_path` 内时，禁止直接文件系统降级。
</HARD-GATE>

<HARD-GATE id="fallback-write-preflight">
直接文件系统创建、更新、移动或删除前，必须通过与工具 Skill 相同的写入前置和删除确认，不得因降级而降低安全标准。
</HARD-GATE>

## 用户反馈

正常使用首选工具时无需增加噪音。发生降级时，用一句话说明“未检测到 {skill}，本次已使用 {fallback}”，并在完成卡片中明确实际执行方式。
