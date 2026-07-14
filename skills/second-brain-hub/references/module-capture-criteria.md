# 保存价值判断

输入：`source_excerpt`、`capture_context`。输出：`keep_decision`、`resonance_reason`、`criteria_hits`。

按四个信号判断：

1. 启发：是否带来新的联想或视角。
2. 实用：是否能支持当前项目或近期行动。
3. 个性：是否与用户经历、判断或表达有关。
4. 新奇：是否明显超出用户已知内容。

最终以用户的真实共鸣作为裁决，不用 Agent 的喜好替代用户。

<HARD-GATE id="resonance-before-capture">
未形成明确共鸣理由或用户保留确认前，不得返回 `keep_decision=true`。
</HARD-GATE>

<HARD-GATE id="extract-limit-before-save">
外源保存时只保留最有价值的片段，不得把未经筛选的全文当作提炼结果写入。
</HARD-GATE>

不适用：合规归档、法律留存或用户明确要求无损保存的资料。此时说明政策能力不适用，但仍遵守目标路径和模板规则。
