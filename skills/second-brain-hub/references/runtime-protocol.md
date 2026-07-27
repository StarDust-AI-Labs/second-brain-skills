# 运行协议

## 配置优先级

使用首个有效来源：

1. 本轮用户明确提供的存储模式、名称和绝对路径。
2. 项目根目录 `.claude/hub-state.json`。
3. 本 Skill 目录旁的 `hub-state.json`。
4. `SECOND_BRAIN_*` 环境变量。
5. 兼容位置 `.Codex/hub-state.json`。

缺少配置时进入 `workflow-onboarding.md`，不得猜路径、让普通用户编辑 JSON，或把真实路径写进版本库。

## 存储模式与首次运行

- `obsidian`：`vault_path`、`vault_name` 有效。
- `markdown`：`workspace_path`、`workspace_name` 有效，兼容字段指向同一目录。

存储类型和绝对路径确认后记 `vault_config=pass`。旧状态只有有效 `vault_path`、`vault_name` 时推断为 `obsidian`；下次获准更新时补兼容字段，不要求重新配置。

## Hub Run Ledger

每次运行建立并持续更新以下字段：

```yaml
vault_config=unchecked; storage_mode=null; storage_path=null
onboarding_status=not_needed; setup_trigger=null; pending_request=null
intent=unclassified; scenario_contract=null
contract_version=null; capability_contract_version=null; dependency_manifest_version=null
dependency_resolution={}; global_preflight=[]; write_preflight=[]
required_chain=[]; completed_steps=[]; optional_steps_skipped=[]
capability_outputs={}; target_path=null; template_ready=false; write_allowed=false
blocked_reason=null
```

`setup_trigger` 是初始化入口的瞬时传输字段，只存在于本轮运行上下文，不写入 `hub-state.json`：

- `post-install-prompt`：README 安装提示词复制完成后直接调用 `SETUP.md`；没有 `pending_request`。
- `runtime-missing-config`：`workflow-onboarding.md` 在运行台账写入该值并保存 `pending_request`，随后把同一台账上下文交给 `SETUP.md`。
- `explicit-reset-or-repair`：用户明确要求重设或修复配置时，Hub 直接调用 `SETUP.md`，不经过 onboarding 适配层。

初始化完成或明确失败并交付结果后清空 `setup_trigger`；只有原业务请求完成或明确阻塞后才清空 `pending_request`。

## 全局执行门控

<HARD-GATE id="vault-config">
Vault 场景未确认存储模式和绝对路径时不得读取或写入笔记；先完成 onboarding。无需存储的系统诊断可记 `not_required`。
</HARD-GATE>

<HARD-GATE id="intent-confirmed">
意图未唯一归类前不得调用场景能力；只追问一个问题。
</HARD-GATE>

<HARD-GATE id="contract-loaded">
未读取所选场景、当前能力契约并登记 `required_steps` 前不得执行。只加载当前场景和能力。
</HARD-GATE>

<HARD-GATE id="dependency-resolved">
调用外部工具前记录 `primary`、`fallback` 或 `blocked`；工具缺失不等于全局阻塞。
</HARD-GATE>

<HARD-GATE id="write-preflight-complete">
写入、更新、移动或删除前必须满足目标路径、模板、授权和场景输出凭证。
</HARD-GATE>

执行每一步前还要确认：此前必选步骤已有输出；条件步骤已执行或有跳过证据；写入前置已通过。禁止用自由判断替代契约输出。

<GATE-TIMEOUT>
每个门控最多重试 3 次；单次超时算阻塞。连续 2 个门控阻塞时停止场景并反馈。重试不得改参数、跳步或绕过门控。
</GATE-TIMEOUT>

## Vault 运行态

Obsidian 模式读取 `{vault_path}/.obsidian/hub-state.json`；Markdown 模式使用 Hub 旁的 `hub-state.json`。完成后记录真实操作回执，`last_operations` 最多保留 20 条。
