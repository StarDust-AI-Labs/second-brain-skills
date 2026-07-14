# 回顾整理工作流

契约：`review`。

1. 确认周回顾、月回顾或项目收尾。
2. 调用 `obsidian-cli/list-search` 获取近期笔记、收件箱和活跃项目。
3. 读取 `module-knowledge-lifecycle.md`，输出发现、优先事项和需要回收的半熟素材。
4. 若发现可复用产物，读取 `module-intermediate-packets.md` 形成素材包；这是回顾内的能力组合，不改变路由必选链。
5. 调用 `obsidian-markdown` 渲染标准回顾笔记。
6. 完成写入前置后调用 `obsidian-cli/create`。

必需输出：`review_scope`、`review_findings`、`final_markdown`、`target_path`。
