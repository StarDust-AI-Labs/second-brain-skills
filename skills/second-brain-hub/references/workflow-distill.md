# 提炼加工工作流

契约：`distill`。

1. 调用 `obsidian-cli/search` 定位候选笔记；存在多个候选时让用户选择。
2. 调用 `obsidian-cli/read` 读取选定笔记。
3. 询问目标层级；用户未指定时默认 L1+L2。
4. 读取 `module-progressive-summarization.md` 并生成更新内容。
5. 完成更新前置后调用 `obsidian-cli/edit`，将 `status` 更新为 `distilled` 并记录层级。

## 步骤痕迹

地图卡每个显示步骤完成后留下的可见痕迹（显示步与顺序见 `route-contracts.json` 的 `progress_map`）：

- 读取笔记：选定笔记名。
- 分层提炼并标亮重点：目标层级（默认 L1+L2）与新增高亮/要点数量。
- 回写笔记：status 更新为 distilled 及记录层级。

必需输出：`selected_note`、`distill_level`、`updated_markdown`。
