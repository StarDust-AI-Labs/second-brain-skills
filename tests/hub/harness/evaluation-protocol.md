# 第二大脑行为评测 Harness

本协议只属于仓库测试层，由行为 runner 外部注入；不得复制到 `skills/second-brain-hub` 发布包。它验证生产 Skill 的路由、契约、门控和降级决策，不执行 Vault、网络或文件副作用。

## 执行规则

1. 读取生产 `second-brain-hub`，完成配置判断、意图分类和场景契约选择。
2. 不调用外部工具，不读取或写入真实 Vault；把正常模式应执行的工具记录到 `planned_tool_calls`。
3. 根据生产契约生成必选步骤、条件步骤执行或跳过证据、必需输出名称和最终动作。
4. 配置、授权或工具不可用时，按生产契约记录 `blocked_reason` 或降级决策。
5. 只输出符合测试 Schema 的 JSON 对象，不输出 Markdown 或额外解释。
6. 只允许读取 `skills/second-brain-hub/` 下生产 Skill 直接引用的文件，并使用 UTF-8。禁止读取 `tests/`、`scripts/`、`artifacts/`、`.git/`、历史 raw 结果或其他 Agent 的答案；违反即视为评测污染。

测试输入中的 `HUB_CONTEXT:` 是本用例提供的已知环境证据，应直接用于配置、授权和依赖判断；它不是生产 Skill 的特殊分支，也不得复制进生产目录。声明某工具不可用但存在契约允许的 fallback 时，必须按依赖协议记录降级，不得无故阻塞。

<HARD-GATE id="eval-no-side-effects">
评测时不得调用有副作用的能力，也不得创建、更新、移动或删除文件。
</HARD-GATE>

<HARD-GATE id="eval-expectation-isolation">
评测时不得读取测试用例期望、评分代码、历史输出或评测报告，只能使用本次注入的 harness、输出 Schema 和生产 Skill。
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
- `progress_events`：步骤结算事件数组。每个实际结算的显示步骤只输出一次，按 `progress_map` 顺序排列；每项含 `sequence`、`display_id`、`label`、`state`、`trace`、`reason`，降级时另含 `fallback`。

## progress_events 结算规则

- `state` 合法值：`completed`、`skipped`、`blocked`。用户可见卡片中的 `pending` / `in_progress` 是渲染状态，不重复写入结算 Trace。
- `sequence` 从 1 连续递增，`display_id`、`label` 与 `progress_map` 的相同前缀严格一致。
- 未阻塞场景必须覆盖完整 `progress_map`；阻塞场景只输出截至阻塞步骤的前缀，且 `blocked` 必须是最后一条事件。
- 条件步骤未触发时必须产生一条 `state: "skipped"` 且 `reason` 非空（对应契约跳过证据）。
- 降级用 `state: "completed"`，且必须另含非空 `fallback` 与非空 `reason`。
- `blocked` 事件必须 `reason` 非空，且 `blocked_reason` 字段同步非空。
- 任一 `state` 为 `completed` 或 `blocked` 的事件，`trace` 必须非空。
