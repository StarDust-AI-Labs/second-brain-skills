# 收件箱处理工作流

契约：`inbox`。

1. 调用 `obsidian-cli/list` 获取收件箱总数和预览。
2. 数量超过告警阈值时提示；超过 5 条时可建议批量模式，但必须由用户确认。
3. 批量建议模式下读取 `module-capture-criteria.md`；逐条模式记录跳过证据。
4. 对每条读取 `module-para-system.md`，给出目标目录和理由。
5. 展示移动、保留或删除预览。删除必须逐项取得明确确认。
6. 完成副作用前置后调用 `obsidian-cli/move-or-delete`。

必需输出：`inbox_preview`、`target_path_or_delete_confirmation`。
