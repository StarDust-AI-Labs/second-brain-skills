# 笔记存储写入管道

## 运行时执行位

第二大脑场景的写入、更新、移动、删除在 `hub-runtime` 内完成：

1. 写入前执行 `preflight --run-id <run_id> --target-path <绝对路径> [--template-file <渲染好的笔记文件>] [--auth]`；`write_allowed=true` 时运行时签发 `write_token`。
2. 仅在取得授权后调用写入能力（`obsidian-cli` 或依赖协议的降级直写）。
3. 写入成功后执行 `commit --run-id <run_id> --token <write_token> --target-path <路径> --receipt <回执JSON>`；运行时会核实目标文件真实存在后才登记回执。
4. `write_allowed=false`、令牌缺失或运行阻塞：立即停止并报告阻塞原因，禁止直写或虚报成功。

`--receipt` 最小形态：`{“tool”:”obsidian-cli”,”operation”:”create”,”ok”:true}`；移动/删除场景 `operation` 取 `move`/`delete`，删除的二次确认仍遵守下文规则。

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

写入后保存：操作类型、工作区内路径、时间、模板状态和工具回执。工具失败时不要宣称成功。
