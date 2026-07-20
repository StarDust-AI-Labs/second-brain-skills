# 首次运行引导

仅在 Vault 场景缺少有效存储配置时读取。目标是在最多一次用户选择后完成配置，并恢复执行用户的原始请求。

## 1. 暂存原请求

将用户原始输入、已分类意图和目标场景写入运行台账的 `pending_request`。不得要求用户配置完成后重新描述任务。

## 2. 只读探测

按当前环境能力检查：

- 本轮用户已经给出的绝对路径。
- 当前工作区及其父目录中包含 `.obsidian/` 的目录。
- 用户主目录下常见的 `Documents/Obsidian`、`Obsidian`、`Vaults` 目录。
- 已存在且包含 Markdown 文件的普通目录。

探测阶段只读，不递归扫描整个磁盘，不读取笔记正文。找到一个候选时仍需用户确认；找到多个时最多展示三个最可能候选。

## 3. 一个问题完成选择

优先给出：

```text
【首次设置】选择第二大脑的存储位置：
A. 使用检测到的 Obsidian Vault：{path}
B. 使用其他已有 Vault 或 Markdown 文件夹
C. 创建一个最小 Markdown 第二大脑（推荐给新用户）
```

没有候选路径时只提供 B 和 C。不要向新用户解释 CODE、PARA、契约、台账或门控。

## 4. 建立配置

- Obsidian 模式：`storage_mode=obsidian`，写入 `vault_path`、`vault_name`，并将 `workspace_path` 指向同一目录。
- Markdown 模式：`storage_mode=markdown`，写入 `workspace_path`、`workspace_name`；兼容字段 `vault_path` 指向同一目录，`vault_name` 使用工作区名称。
- 已有目录：不创建或重命名现有内容。
- 新工作区：用户确认目标绝对路径后，按最小工作区协议初始化。

用户对某个已有目录的确认，只授权保存本地配置；用户确认“在 {path} 创建最小工作区”时，只授权创建最小工作区列出的五个目录和本地配置。不得把首次设置授权扩展为其他笔记写入、移动或删除授权。

配置写入 Hub 旁的本地 `hub-state.json`，不得写入版本库。写入失败时保持 `onboarding.completed=false`，不得留下声称成功的回执。

## 5. 恢复原任务

配置通过后将 `vault_config=pass`，恢复 `pending_request` 对应的场景契约并继续执行。成功后清空 `pending_request`。

<HARD-GATE id="onboarding-path-confirmed">
用户未确认已有目录或新建目标的绝对路径前，不得创建目录、配置文件或笔记。
</HARD-GATE>

<HARD-GATE id="onboarding-limited-write-scope">
首次设置的写入范围仅限用户确认的存储根目录、五个最小目录（Obsidian 模式含 `.obsidian/` 标记目录）和 Hub 本地配置；原始任务产生的笔记写入仍需通过对应场景的写入前置。
</HARD-GATE>

<HARD-GATE id="onboarding-resume-original-request">
首次配置完成后必须恢复原始用户请求；不得以“配置完成”代替用户最初要求的产物。
</HARD-GATE>
