# 笔记存储写入管道

## 运行时执行位

第二大脑场景的写入、更新、移动、删除由 `hub-runtime` 的 `write` 命令实际执行，禁止外部工具直写：

1. 写入前执行 `preflight --run-id <run_id> --target-path <绝对路径> [--template-file <渲染好的笔记文件>] [--confirm]`；`write_allowed=true` 时运行时签发一次性 `write_token`。
2. 取得令牌后执行 `write --run-id <run_id> --token <write_token> --operation create|edit|move|delete [--target-path <路径>] [--source-path <路径>] [--content|--content-file <内容>]`；文件操作由运行时完成，并记录前后哈希与含一次性 `runtime_write_id` 的运行时回执。create/edit 的写入内容必须通过与 preflight 模板相同的 frontmatter 结构校验。
3. 多文件写入（如笔记 + 状态回写）在同一 run 内重复 `preflight→write` 循环，每轮签发新令牌并重新校验真实路径。
4. `write_allowed=false`、令牌缺失或运行阻塞：立即停止并报告阻塞原因，禁止直写或虚报成功。移动/删除的 `--confirm` 二次确认仍遵守下文规则，删除执行时须回传 preflight 签发的确认令牌（`--confirmation <token>`）。

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
