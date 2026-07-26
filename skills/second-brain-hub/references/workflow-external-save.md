# 保存外源工作流

契约：`external-save`。

1. 调用 `defuddle` 提取标题、正文和原文字数。失败时请用户粘贴正文，不得凭 URL 猜内容。
2. 读取 `module-capture-criteria.md`，形成是否保留的判断；不保留时停止写入并反馈理由。
3. 读取 `module-para-system.md`，确认目标文件夹。
4. 读取 `module-progressive-summarization.md`，执行 L1，保留约 10% 的高价值原文段落并输出核心要点。
5. 调用 `obsidian-markdown` 渲染模板，记录 URL、提取工具和 `distill_level: 1`。
6. 完成写入前置后调用 `obsidian-cli/create`。

## 步骤痕迹

地图卡每个显示步骤完成后留下的可见痕迹（显示步与顺序见 `route-contracts.json` 的 `progress_map`）：

- 抓取内容：来源标题与原文字数。
- 价值判断：保留结论（不保留时说明理由并停止）。
- 确认归档目录：目标文件夹。
- 提炼要点：核心要点条数与 L1 标记。
- 渲染模板：笔记标题。
- 写入归档：Vault 内实际路径。

必需输出：`keep_decision=true`、`target_folder`、`distilled_excerpt`、`final_markdown`。
