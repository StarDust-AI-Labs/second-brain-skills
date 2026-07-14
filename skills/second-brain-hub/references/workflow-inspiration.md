# 灵感速记工作流

契约：`inspiration`。

1. 从 `active_projects` 提供候选，确认灵感归属并记录 `target_path`。用户说都不相关时，选择资源或收件箱，但不得猜测具体项目。
2. 用户对价值犹豫时，读取 `module-capture-criteria.md`；否则记录跳过证据。
3. 生成 `灵感-{关键词}_{YYYY-MM-DD-HHmm}` 标题。
4. 调用 `obsidian-markdown` 渲染模板，包含用户原话、整理后的表达和一句核心要点。
5. 完成写入前置后调用 `obsidian-cli/create`。
6. 保存回执并更新运行态。

必需输出：`target_path`、`final_markdown`。
