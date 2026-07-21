# 笔记存储写入管道

## 写入前置

在创建、更新、移动或删除前检查 `route-contracts.json` 的 `write_preflight`：

- 创建或更新：`target_path` 不为空且不是所选存储工作区根目录。
- 移动：目标目录已确认且不是所选存储工作区根目录。
- 删除：用户已明确确认删除具体文件。
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
