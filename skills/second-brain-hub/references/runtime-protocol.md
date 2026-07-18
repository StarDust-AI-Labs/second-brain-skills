# 运行协议

## 目录

- 配置优先级
- 存储模式与首次运行
- Hub Run Ledger
- 执行锁
- Vault 运行态

## 配置优先级

按以下顺序定位配置，使用第一个有效来源：

1. 本轮对话中用户明确提供的 `vault_path`、`vault_name`。
2. 项目根目录 `.claude/hub-state.json`。
3. 本 Skill 目录旁的 `hub-state.json`。
4. 环境变量：Obsidian 使用 `SECOND_BRAIN_VAULT_PATH`、`SECOND_BRAIN_VAULT_NAME`；Markdown 使用 `SECOND_BRAIN_WORKSPACE_PATH`、`SECOND_BRAIN_WORKSPACE_NAME`，并设置 `SECOND_BRAIN_STORAGE_MODE=markdown`。
5. 兼容位置 `.Codex/hub-state.json`。

没有配置时不得直接要求用户理解或编辑 JSON。读取 `workflow-onboarding.md`，暂存原请求并完成一次选择式引导。真实路径不得写进版本库。

## 存储模式与首次运行

- `obsidian`：使用 Obsidian Vault；`vault_path`、`vault_name` 有效。
- `markdown`：使用普通 Markdown 工作区；`workspace_path`、`workspace_name` 有效，兼容字段 `vault_path`、`vault_name` 指向同一位置。

`vault_config` 是兼容字段：任一模式的存储类型和绝对路径均已确认时记为 `pass`。Vault 场景配置缺失时进入 onboarding，而不是直接终止场景。

旧配置兼容：`storage_mode` 缺失但 `vault_path`、`vault_name` 有效时，运行时推断为 `obsidian`，并在下一次获准更新本地状态时补写 `storage_mode`、`workspace_path` 和 `workspace_name`，不得要求老用户重新配置。

## Hub Run Ledger

每次运行建立并持续更新：

```yaml
hub_run_ledger:
  vault_config: unchecked | pass | not_required | blocked
  storage_mode: null | obsidian | markdown
  storage_path: null
  onboarding_status: not_needed | required | awaiting_choice | initialized | failed
  pending_request: null
  intent: unclassified | 灵感速记 | 保存外源 | 提炼加工 | 创作启动 | 收件箱处理 | 回顾整理 | 探索查询 | 系统诊断
  scenario_contract: null
  contract_version: null
  capability_contract_version: null
  dependency_manifest_version: null
  dependency_resolution: {}
  global_preflight: []
  write_preflight: []
  required_chain: []
  completed_steps: []
  optional_steps_skipped: []
  capability_outputs: {}
  target_path: null
  template_ready: false
  write_allowed: false
  blocked_reason: null
```

## 执行锁

进入任何步骤前检查：

1. `vault_config = pass`；缺少配置时先完成 onboarding，系统诊断不读取存储时可记录 `not_required` 证据。
2. `intent` 已归类。
3. 已读取选中场景契约和当前步骤需要的能力契约，并选择唯一 `scenario_contract`。
4. 当前步骤之前的所有必选步骤已有输出凭证。
5. 条件步骤已执行，或已有契约指定的跳过证据。
6. 副作用操作已完成对应 `write_preflight`。
7. 当前步骤需要外部工具时，其实现已解析为 `primary` 或满足门控的 `fallback`；解析为 `blocked` 时只停止当前能力或场景。

禁止用 Hub 自己的自由判断替代契约要求的能力输出。

## Vault 运行态

Obsidian 模式配置通过后读取 `{vault_path}/.obsidian/hub-state.json`。Markdown 模式不要求 `.obsidian` 目录，运行状态保存在 Hub 旁的本地 `hub-state.json`。运行完成后将操作摘要加入 `last_operations`，最多保留最近 20 条。
