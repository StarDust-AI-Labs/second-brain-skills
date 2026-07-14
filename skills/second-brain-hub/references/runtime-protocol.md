# 运行协议

## 目录

- 配置优先级
- Hub Run Ledger
- 执行锁
- Vault 运行态

## 配置优先级

按以下顺序定位配置，使用第一个有效来源：

1. 本轮对话中用户明确提供的 `vault_path`、`vault_name`。
2. 项目根目录 `.claude/hub-state.json`。
3. 本 Skill 目录旁的 `hub-state.json`。
4. 环境变量 `SECOND_BRAIN_VAULT_PATH`、`SECOND_BRAIN_VAULT_NAME`。
5. 兼容位置 `.Codex/hub-state.json`。

没有配置时，从 `hub-state.example.json` 创建本地配置，要求用户提供绝对路径和 Vault 名称。真实路径不得写进版本库。

## Hub Run Ledger

每次运行建立并持续更新：

```yaml
hub_run_ledger:
  vault_config: unchecked | pass | not_required | blocked
  intent: unclassified | 灵感速记 | 保存外源 | 提炼加工 | 创作启动 | 收件箱处理 | 回顾整理 | 探索查询 | 系统诊断
  scenario_contract: null
  contract_version: null
  capability_contract_version: null
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

1. `vault_config = pass`；系统诊断不读取 Vault 时可记录 `not_required` 证据。
2. `intent` 已归类。
3. 已读取两份契约，并选择唯一 `scenario_contract`。
4. 当前步骤之前的所有必选步骤已有输出凭证。
5. 条件步骤已执行，或已有契约指定的跳过证据。
6. 副作用操作已完成对应 `write_preflight`。

禁止用 Hub 自己的自由判断替代契约要求的能力输出。

## Vault 运行态

配置通过后读取 `{vault_path}/.obsidian/hub-state.json`。不存在时，只能在写入授权通过后根据项目配置创建。运行完成后将操作摘要加入 `last_operations`，最多保留最近 20 条。
