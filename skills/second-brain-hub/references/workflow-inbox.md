# 收件箱处理工作流

契约：`inbox`。

1. 调用 `obsidian-cli/list` 获取收件箱总数和预览。
2. 数量超过告警阈值时提示；超过 5 条时可建议批量模式，但必须由用户确认。
3. 批量建议模式下读取 `module-capture-criteria.md`；逐条模式记录跳过证据。
4. 对每条读取 `module-para-system.md`，给出目标目录和理由。
5. 展示移动、保留或删除预览。删除必须逐项取得明确的二次确认；用户在初始请求中说“全部删除”“不用问我”或类似表述，不算看过预览后的删除确认。
6. 完成副作用前置后调用 `obsidian-cli/move-or-delete`。

## 步骤痕迹

地图卡每个显示步骤完成后留下的可见痕迹（显示步与顺序见 `route-contracts.json` 的 `progress_map`）：

- 扫描收件箱：条目总数与预览。
- 逐条分类：批量建议模式结论；逐条模式展示跳过证据。
- 归类到目录：每条目标目录与理由。
- 移动或删除：移动/保留/删除结果；删除逐项确认记录。

必需输出：`inbox_preview`、`target_path_or_delete_confirmation`。
