# 运行协议

## 配置优先级

使用首个有效来源：

1. 本轮用户明确提供的存储模式、名称和绝对路径。
2. 项目根目录 `.claude/hub-state.json`。
3. 本 Skill 目录旁的 `hub-state.json`。
4. `SECOND_BRAIN_*` 环境变量。
5. 兼容位置 `.Codex/hub-state.json`。

缺少配置时进入 `workflow-onboarding.md`，不得猜路径或把真实路径写进版本库。## 存储模式

- `obsidian`：`vault_path`、`vault_name` 有效。
- `markdown`：`workspace_path`、`workspace_name` 有效，兼容字段指向同一目录。

确认后记 `vault_config=pass`。旧状态只有有效 `vault_path`、`vault_name` 时推断为 `obsidian`，更新时补兼容字段。

## Hub Runtime 执行器

第二大脑场景的执行由 `scripts/hub-runtime.mjs` 强制（Node 零依赖）。运行时判定权威。退出码：`0` 成功；`1` 拒绝；`2` 用法/阻塞。
状态机：`INIT → CONFIG_CHECKED → INTENT_CLASSIFIED → CONTRACT_LOADED → MAP_CARD_EMITTED → EXECUTING ⇄ PREFLIGHTED → WRITE_COMMITTED → COMPLETION_CARD_EMITTED`。

命令（输出 JSON，`card` 原样展示）：
- `start --state-dir <dir>`：配置检查，签发 `run_id`。- `route --run-id <id> --scene <场景id> --user-text <原话>`：登记意图与契约，返回开始地图卡。- `step --run-id <id> --step <id> --evidence <痕迹>`：步骤凭证；输出用 `--output 键=值`；条件步骤未触发用 `--skip --reason <证据>`。- `preflight --run-id <id> --target-path <绝对路径> [--template-file <笔记>] [--auth]`：前置全过才返回 `write_allowed=true` 与 `write_token`。- `commit --run-id <id> --token <write_token> --target-path <路径> --receipt <回执JSON>`：校验令牌并核实目标存在后结算写入步骤。- `finish --run-id <id> [--result <一句话>]`：完成前验证通过才返回完成卡。- `gate` / `status`：写入前门禁检查 / 台账与地图卡审计。
台账持久化在 `<state-dir>/hub-runs/<run_id>.json`，含契约快照、步骤与跳过证据、门控结果、回执。
<HARD-GATE id="runtime-mandatory">
第二大脑场景的 Vault 读写删移须经 `hub-runtime`；无有效 `run_id`、步骤凭证或 `write_allowed=true` 时不得执行，不得自行宣布完成。普通 Obsidian 操作与通用 Markdown 写入不经运行时。
</HARD-GATE>
<HARD-GATE id="fail-closed">
门禁失败、令牌缺失、运行阻塞或运行时不可用时，停止写入并报告阻塞原因；禁止静默直写。
</HARD-GATE>

## 全局执行门控

<HARD-GATE id="vault-config">
Vault 场景未确认存储模式与绝对路径时不得读写笔记；先完成 onboarding。无需存储的系统诊断记 `not_required`。
</HARD-GATE>
<HARD-GATE id="intent-confirmed">
意图未唯一归类前不得调用场景能力；只追问一个问题。
</HARD-GATE>
<HARD-GATE id="contract-loaded">
未读取所选场景与能力契约并登记 `required_steps` 前不得执行。只加载当前场景和能力。
</HARD-GATE>
<HARD-GATE id="dependency-resolved">
调用外部工具前记录 `primary`、`fallback` 或 `blocked`；工具缺失不等于全局阻塞。
</HARD-GATE>
<HARD-GATE id="write-preflight-complete">
写入、更新、移动或删除前必须满足目标路径、模板、授权和场景输出凭证。
</HARD-GATE>
<GATE-TIMEOUT>
门控最多重试 3 次；超时算阻塞。连续 2 个门控阻塞时停止场景并反馈。重试不得改参数、跳步或绕过门控。
</GATE-TIMEOUT>
## Onboarding 传输字段

运行台账中 `setup_trigger=null` 是默认值。`setup_trigger` 是初始化入口的瞬时传输字段，只存在于本轮运行上下文，不写入 `hub-state.json`：
- `post-install-prompt`：README 安装提示词复制完成后直接调用 `SETUP.md`；没有 `pending_request`。
- `runtime-missing-config`：`workflow-onboarding.md` 写入该值并保存 `pending_request`，随后交给 `SETUP.md`。
- `explicit-reset-or-repair`：用户要求重设或修复配置时直接调用 `SETUP.md`，不经过 onboarding。
初始化完成或明确失败并交付后清空 `setup_trigger`；原业务请求完成或阻塞后才清空 `pending_request`。
## Vault 运行态

Obsidian 模式读 `{vault_path}/.obsidian/hub-state.json`；Markdown 模式用 Hub 旁 `hub-state.json`。完成后记录真实回执，`last_operations` 最多 20 条。