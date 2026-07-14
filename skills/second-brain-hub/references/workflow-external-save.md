# 保存外源工作流

契约：`external-save`。

1. 调用 `defuddle` 提取标题、正文和原文字数。失败时请用户粘贴正文，不得凭 URL 猜内容。
2. 读取 `module-capture-criteria.md`，形成是否保留的判断；不保留时停止写入并反馈理由。
3. 读取 `module-para-system.md`，确认目标文件夹。
4. 读取 `module-progressive-summarization.md`，执行 L1，保留约 10% 的高价值原文段落并输出核心要点。
5. 调用 `obsidian-markdown` 渲染模板，记录 URL、提取工具和 `distill_level: 1`。
6. 完成写入前置后调用 `obsidian-cli/create`。

必需输出：`keep_decision=true`、`target_folder`、`distilled_excerpt`、`final_markdown`。
