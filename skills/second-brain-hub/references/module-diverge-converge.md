# 发散与聚合诊断

输入：`creation_blocker_signals`、`project_state`。输出：`mode_diagnosis`、`recommended_mode_switch`、`next_constraint`。

诊断规则：

- 候选太少、视角单一、过早定稿：需要发散。
- 持续收集、方向过多、无法决定或交付：需要聚合。
- 已有明确材料和下一步：返回不适用，不额外增加流程。

推荐切换必须附一个可执行约束，例如“再生成 5 个方向后停止收集”或“只保留支持核心论点的 3 个素材”。本模块解释为什么卡住，不代替 `creative-workflow` 产出实际中间成果。
