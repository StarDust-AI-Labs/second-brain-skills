# 渐进式提炼

输入：`selected_note_or_source`、`target_distill_level`。输出：`distill_level`、`distilled_excerpt`、`core_points`。

层级：

- L1：保留约 10% 的高价值原文片段。
- L2：在 L1 中加粗关键句，通常不超过 L1 的 20%。
- L3：在 L2 中高亮最核心观点，通常不超过 L2 的 20%。
- L4：在顶部写出可独立阅读的纲要总结。

逐层处理，不得跳层伪造更高层级。保留来源语境和原始链接。

<HARD-GATE id="source-selected-before-distill">
未定位并读取唯一来源前，不得开始提炼或更新笔记。
</HARD-GATE>

<HARD-GATE id="density-limit-before-update">
提炼结果未体现逐层压缩，或关键标注接近全文时，不得覆盖原笔记。
</HARD-GATE>
