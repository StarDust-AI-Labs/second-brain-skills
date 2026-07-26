# 灵感速记工作流

契约：`inspiration`。

1. 从 `active_projects` 提供候选，确认灵感归属并记录 `target_path`。用户说都不相关时，选择资源或收件箱，但不得猜测具体项目。
2. 用户对价值犹豫时，读取 `module-capture-criteria.md`；否则记录跳过证据。
3. 生成 `灵感-{关键词}_{YYYY-MM-DD-HHmm}` 标题。
4. 调用 `obsidian-markdown` 渲染模板，包含用户原话、整理后的表达和一句核心要点。
5. 完成写入前置后调用 `obsidian-cli/create`。
6. 保存回执并更新运行态。

## 步骤痕迹

地图卡每个显示步骤完成后留下的可见痕迹（显示步与顺序见 `route-contracts.json` 的 `progress_map`）：

- 确认归属：归属的目标路径（如「→ Projects/产品迭代」）。
- 价值判断：保留/不保留结论；跳过时展示契约跳过证据。
- 渲染模板：已生成的笔记标题（如「灵感-订阅制复盘_2026-07-25-2113」）。
- 写入归档：Vault 内实际路径。

必需输出：`target_path`、`final_markdown`。
