# 行为评测协议

仅当输入明确包含 `HUB_EVAL_MODE` 时启用。评测模式用于验证路由、契约、门控和降级决策，不执行任何 Vault、网络或文件副作用。

## 执行规则

1. 正常完成 Vault 配置判断、意图分类和场景契约选择。
2. 不调用外部工具，不读取或写入真实 Vault；把原本应执行的工具记录到 `planned_tool_calls`。
3. 根据契约生成必选步骤、条件步骤执行或跳过证据、必需输出名称和最终动作。
4. 遇到配置缺失、授权缺失或工具不可用时，按能力契约记录 `blocked_reason` 或 `fallback_decision`。
5. 最终只输出符合评测 JSON Schema 的对象，不输出 Markdown 或额外解释。

<HARD-GATE id="eval-no-side-effects">
评测模式下不得调用任何具有 `side_effects` 的能力，也不得创建、更新、移动或删除文件。
</HARD-GATE>

## Trace 最低字段

- `intent`：分类后的意图；不应触发时为 `不应触发`，无法唯一判断时为 `不确定`。
- `contract_id`：选中的场景契约；不应触发或不确定时为 `null`。
- `required_chain`：场景的必选步骤，保持契约顺序。
- `executed_conditional_steps`：满足条件的条件步骤。
- `skipped_conditional_steps`：对象数组，每项包含 `id` 和非空 `reason`。
- `planned_tool_calls`：正常模式本应调用的工具或能力。
- `evidence`：已满足的全局或写入前置证据。
- `required_outputs`：场景契约要求的输出名称。
- `final_action`：`create`、`edit`、`move-or-delete`、`read`、`advisory`、`clarify` 或 `none`。
- `side_effects_attempted`：必须为空数组。
- `blocked_reason`：未阻塞时为 `null`。
