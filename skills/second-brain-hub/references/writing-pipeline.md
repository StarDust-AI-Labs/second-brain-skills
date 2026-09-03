# 笔记存储写入管道

## 运行时执行位

第二大脑场景的写入、更新、移动、删除由 `hub-runtime` 的 `write` 命令实际执行，禁止外部工具直写：

1. 写入前执行 `preflight --run-id <run_id> --operation create|edit|move|delete --target-path <绝对路径> [--source-path <路径>] [--template-file <渲染好的笔记文件>]`；`write_allowed=true` 时 create/edit 立即签发一次性 `write_token` 并开启 pending 周期。移动/删除则进入 `awaiting_confirmation`：运行时读取真实源文件，计算 `source_sha256`/`size`/`snapshot_hash`，返回规范 `preview` 与 `confirmation_challenge`，**不签发任何可执行令牌**；调用方传入的 `--preview`/`--preview-file`/`--preview-hash` 一律拒绝。响应返回 `operation`、`source_path`、`target_path`、`source_sha256`、`snapshot_hash`、`write_cycle`，移动/删除还返回 `confirmation_challenge`。
2. 取得令牌后执行 `write --run-id <run_id> --token <write_token> [--operation <操作>] [--target-path <路径>] [--source-path <路径>] [--content|--content-file <内容>] [--confirmation <令牌>]`；文件操作由运行时完成，并记录前后哈希与含一次性 `runtime_write_id` 的运行时回执。create/edit 的写入内容必须通过与 preflight 模板相同的 frontmatter 结构校验。
3. 运行时逐项核对实际参数与 preflight 快照：操作类型、目标路径、源路径必须一致；create 令牌不得用于 edit/move/delete；move 的源路径必须已获批准。
4. 多文件写入（如笔记 + 状态回写）在同一 run 内重复 `preflight→write` 循环，每轮签发新令牌并重新校验真实路径；新一轮 preflight 会作废上一轮的提交状态，未 write 的周期必须结算后才能 finish。
5. `write_allowed=false`、令牌缺失、快照不符或运行阻塞：立即停止并报告阻塞原因，禁止直写或虚报成功。

## 移动与删除的确认链

删除与移动属于危险操作，授权必须是可核对的凭证链：

1. 第一阶段（preflight）：运行时读取真实文件生成 `preview` 与 `confirmation_challenge`，向用户展示具体目标（文件内容或移动前后路径）。此阶段**不签发可执行令牌**。
2. 第二阶段（confirm）：只有收到预览后的新用户确认消息，才调用 `confirm --run-id <run_id> --cycle <周期id> --challenge <challenge>`；运行时据此签发一次性 `write_token` + `confirmation_token`，周期转为 `pending`。
3. `write` 执行时回传 `confirmation_token`（`--confirmation <token>`）；令牌绑定运行号、周期、操作、源/目标路径、`source_sha256`、`snapshot_hash`、`preview_hash`，只可使用一次，缺失、错误或重放均被拒绝。
4. 写前运行时重新读取源文件并计算 SHA-256，与确认快照不一致（文件在确认后变化）立即失败关闭，需重新 preflight+confirm。
5. 信任边界：令牌仅证明“某快照被确认”，运行时无法从密码学上证明是人类确认；Agent 协议要求预览后必须有新的用户确认消息才能调用 `confirm`。“全部删除/不用确认”不是二次确认。

## 写入前置

以下前置条件由 `hub-runtime preflight` 统一评估：

- 创建或更新：`target_path` 不为空且不是所选存储工作区根目录。
- 移动：目标目录已确认且不是所选存储工作区根目录。
- 删除：用户已在看到具体文件预览后，逐项明确确认删除。初始请求中的删除指令不是二次确认，”全部删掉且不用确认”不得绕过本门控。
- 创建笔记：`obsidian-markdown` 已输出 `final_markdown` 和必需 frontmatter。
- 所有副作用：`write_allowed=true`。

## 标准 frontmatter

按场景填充适用字段：

```yaml
---
source: ""
captured: YYYY-MM-DD HH:mm
project: ""
status: inbox | organized | distilled | active | archived
tags: []
distill_level: 0
---
```

正文至少包含标题、来源内容或产物，以及“核心要点”callout。不要由 Hub 绕过 `obsidian-markdown` 自行拼接最终 Markdown。

## 命名

- 灵感：`灵感-{关键词}_{YYYY-MM-DD-HHmm}`
- 外源：优先使用网页标题，必要时加日期避免重名。
- 回顾：`周回顾_YYYY-Www` 或 `月回顾_YYYY-MM`。
- 创作项目：使用用户确认的产物名称，不使用“新建文档”等泛化标题。

## 写入回执

回执由运行时在 `write` 成功后自动生成并登记：操作类型、路径、时间、前后内容哈希、一次性 `runtime_write_id`。运行外写入没有回执，也不满足完成验证。工具失败时不要宣称成功。
