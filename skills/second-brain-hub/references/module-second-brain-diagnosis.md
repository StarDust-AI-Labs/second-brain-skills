# 第二大脑综合诊断器

> **与 module-code-diagnosis 的分层关系**：
> - `module-code-diagnosis`：纯 CODE 四步定位，仅输出 `bottleneck_stage`，适用于单一瓶颈场景。
> - `module-second-brain-diagnosis`（本模块）：综合诊断器，在第一层定位后进一步输出 `next_experiment`（可执行实验）和 `recommended_scene`（推荐场景），适用于需要给用户行动方案的场景。
> - 调用规则：`workflow-diagnosis` 始终先调用本模块，本模块内部 step 1 读取 `module-code-diagnosis` 完成 CODE 定位，step 2 根据需要读取 `module-diverge-converge`，step 3-4 补齐实验和场景推荐。

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
