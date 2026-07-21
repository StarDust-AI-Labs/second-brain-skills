# 第二大脑综合诊断器

输入：`system_symptoms`、`recent_example`。输出：`bottleneck_stage`、`diagnosis_evidence`、`recommended_scene`、`next_experiment`。

## 可执行性要求

诊断不是泛泛建议。`next_experiment` 必须是一个能在 15-30 分钟内完成的小实验，并明确写出：

- `duration`：预计耗时；
- `target`：要处理的具体对象或数量；
- `first_action`：用户下一步立即执行的动作；
- `done_when`：什么结果算完成；
- `recommended_scene`：完成后进入的一个已有场景。

如果缺少具体症状或案例，只追问一个诊断问题，不生成泛化方案。

1. 读取 `module-code-diagnosis.md`，确定信息流主瓶颈。
2. 症状包含持续收集、方向过多、完美主义或无法收尾时，再读取 `module-diverge-converge.md`。
3. 选择一个 15-30 分钟可完成的纠偏实验，并补齐上述五个字段。
4. 推荐进入一个现有执行场景，但等待用户确认后再切换。

示例实验：只处理 5 条收件箱、将 1 篇长笔记提炼到 L2、用 3 个已有素材形成一个最小大纲。不要在诊断阶段直接改动 Vault。
