# 系统诊断工作流

契约：`diagnosis`。该场景不读写 Vault，除非用户随后明确要求进入某个执行场景。

1. 收集一个具体症状和一个最近案例，不进行泛化人格判断。
2. 读取 `module-second-brain-diagnosis.md`。
3. 用 CODE 判断主要瓶颈位于抓取、组织、提炼或表达。
4. 如果症状涉及持续收集、方向过多或无法交付，再使用发散/聚合诊断。
5. 输出一个主瓶颈、证据、最小纠偏动作和推荐进入的现有场景。
6. 不自动写入、不自动改目录、不同时启动多个场景。

必需输出：`bottleneck_stage`、`diagnosis_evidence`、`recommended_scene`、`next_experiment`。
