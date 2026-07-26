# 第二大脑行为评测 Harness

本协议只属于仓库测试层，由行为 runner 外部注入；不得复制到 `skills/second-brain-hub` 发布包。它验证生产 Skill 的路由、契约、门控和降级决策，不执行 Vault、网络或文件副作用。

## 执行规则

1. 读取生产 `second-brain-hub`，完成配置判断、意图分类和场景契约选择。
2. 不调用外部工具，不读取或写入真实 Vault；把正常模式应执行的工具记录到 `planned_tool_calls`。
3. 根据生产契约生成必选步骤、条件步骤执行或跳过证据、必需输出名称和最终动作。
4. 配置、授权或工具不可用时，按生产契约记录 `blocked_reason` 或降级决策。
5. 只输出符合测试 Schema 的 JSON 对象，不输出 Markdown 或额外解释。

<HARD-GATE id="eval-no-side-effects">
评测时不得调用有副作用的能力，也不得创建、更新、移动或删除文件。
</HARD-GATE>

## Trace 最低字段

- `intent`：分类意图；不应触发为 `不应触发`，无法唯一判断为 `不确定`。
- `contract_id`：场景契约；不应触发或不确定时为 `null`。
- `required_chain`：必选步骤，保持生产契约顺序。
- `executed_conditional_steps`：满足条件的条件步骤。
- `skipped_conditional_steps`：对象数组，每项包含 `id` 和非空 `reason`。
- `planned_tool_calls`：正常模式应调用的工具或能力。
- `evidence`：已满足的全局或写入前置证据。
- `required_outputs`：生产契约要求的输出名称。
- `final_action`：`create`、`edit`、`move-or-delete`、`read`、`advisory`、`clarify` 或 `none`。
- `side_effects_attempted`：必须为空数组。
- `blocked_reason`：未阻塞时为 `null`。
- `progress_events`：按 `progress_map` 顺序输出的显示步骤事件数组，每项含 `sequence`、`display_id`、`label`、`state`、`trace`、`reason`，降级时另含 `fallback`。

## progress_events 状态机

- `state` 合法值：`pending`、`in_progress`、`completed`、`skipped`、`blocked`。
- 事件顺序必须单调递增且与 `progress_map` 显示顺序一致。
- 合法迁移：`pending → in_progress → completed|skipped|blocked`；`blocked` 之后不得再出现后续步骤的 `in_progress` 或 `completed`。
- 条件步骤未触发时必须产生一条 `state: "skipped"` 且 `reason` 非空（对应契约跳过证据）。
- 降级用 `state: "completed"` 且必须另含非空 `fallback` 与原因。
- `blocked` 事件必须 `reason` 非空，且 `blocked_reason` 字段同步非空。
- 任一 `state` 为 `completed` 或 `blocked` 的事件，`trace` 必须非空。
