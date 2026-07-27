# 首次运行适配

<!-- onboarding-adapter-only: setup-source=../SETUP.md -->

本文件只负责在 Hub 运行中接入初始化、保存上下文和恢复原任务，不定义知识库初始化步骤。唯一初始化 SOP 是 [../SETUP.md](../SETUP.md)；安装提示词、手工安装后的首次调用、重设和配置修复都必须执行同一份 SOP。

仅在 Vault 场景缺少有效存储配置时读取本文件。无需存储的系统诊断不进入初始化。

## 1. 暂存原请求

将用户原始输入、已分类意图和目标场景写入运行台账的 `pending_request`，并在同一台账写入 `setup_trigger=runtime-missing-config`。不得要求用户配置完成后重新描述任务，也不得把原请求交给 `SETUP.md` 消费或改写。

## 2. 调用唯一初始化 SOP

完整读取并严格执行 [../SETUP.md](../SETUP.md)。入口上下文通过当前 `Hub Run Ledger` 传递；`SETUP.md` 在第 0 步前读取该台账，不创建第二份参数文件：

- 台账字段 `setup_trigger=runtime-missing-config`
- 当前配置检查结果
- `pending_request` 已由本适配层保存
- 初始化完成后返回本适配层

不得在本文件重复定义环境探测、存储选择、PARA 目录创建、配置模板写入或最小验证。已有有效配置时按 `SETUP.md` 第 0 步跳过初始化并返回；配置缺失或失效时完整执行同一 SOP。

## 3. 接收统一结果

只有 `SETUP.md` 第 5 步验证成功，并返回以下结果时，初始化才算完成：

- `setup_status=success`
- 已确认的 `storage_mode`
- 已验证的 `workspace_path`
- 已验证的 `hub_state_path`
- `onboarding_completed=true`

失败时保持 `vault_config=blocked`，保留 `pending_request`，向用户说明失败步骤、原因和恢复办法。不得留下成功回执、成功卡或继续执行 Vault 场景。

## 4. 恢复原任务

成功时将 `vault_config=pass`，恢复 `pending_request` 对应的场景契约并继续执行；涉及笔记写入、更新、移动或删除时，必须重新通过该场景的写入前置，初始化授权不得继承为业务操作授权。初始化结果交付后清空 `setup_trigger`；原任务完成或明确阻塞后再清空 `pending_request`。

## 5. 用户可见交付

纯初始化的交付文案由 `SETUP.md` 第 6 步负责。首次调用触发初始化时，不单独再输出一张“初始化成功卡”；只有原请求确实完成第一次笔记写入后，才按 `output-cards.md` 输出唯一的首次成功卡。原请求失败时只报告真实状态。

<HARD-GATE id="onboarding-path-confirmed">
`SETUP.md` 尚未取得用户对已有目录或新建目标绝对路径的确认时，不得创建目录、配置文件或笔记。
</HARD-GATE>

<HARD-GATE id="onboarding-limited-write-scope">
初始化写入范围只能是 `SETUP.md` 明确授权的存储根目录、最小目录结构和 Hub 本地配置；原始任务的任何副作用必须重新授权并通过对应场景前置。
</HARD-GATE>

<HARD-GATE id="onboarding-resume-original-request">
初始化成功后必须恢复原始用户请求；不得以“配置完成”代替用户最初要求的产物，也不得要求用户重新输入。
</HARD-GATE>
