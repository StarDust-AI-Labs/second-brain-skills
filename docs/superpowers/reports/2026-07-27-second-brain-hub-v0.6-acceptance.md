# second-brain-hub v0.6.0 验收与交接

- 日期：2026-07-27
- 候选分支：`feat/progress-map-cards-main`
- 基线：`origin/main` at `147e0b974f8e7ed5093658a2dd434db412337327`
- 已验证候选：`8f430f9`（评测夹具最终修正）
- 本地 PR 合并提交：`dfd33a8`（最终门禁已在该提交上复验）
- 计划 tag：`v0.6.0`
- 当前结论：候选版本通过全部发布门禁；应先合并到 `main`，再把 annotated tag 打在合并后的 `main` 提交上。

## 1. 本次范围

本次版本为 8 个 Hub 场景增加由 `route-contracts.json` 派生的 Progress Map Cards，包括：

- 单一事实源的 `progress_map` 显示映射；
- 开始、进度、决策、完成四类地图卡；
- 条件步骤跳过、工具降级和门控阻塞的强制可见痕迹；
- 外部行为评测中的结构化 `progress_events`；
- 固定上下文预算收紧到 10,000 bytes；
- 100 分制发布质量门禁和 17 个行为用例。

## 2. PR 审核结论

### 已修复的阻塞项

1. **评测 runner 在当前 Windows Codex Desktop 环境无法嵌套启动 WindowsApps CLI。**
   - 增加可选 `CodexCommand`，允许显式指定 CLI 入口。
   - 增加 `RawResultsPath`，允许对隔离 `codex exec` 生成的原始 JSON 使用同一发布评分器重放评分。
   - 当前机器可用 CLI：`C:\Users\24424\AppData\Local\nvm\v20.19.0\codex.cmd`。

2. **Progress 评分缺省值错误。**
   - `must_have_completed` 不存在时，旧逻辑仍遍历一个空值，导致大多数用例的 Progress 固定为 0。
   - 已过滤空值；配置缺失阻塞冒烟从 `80/100` 恢复为 `100/100`。

3. **阻塞用例的最终动作与生产语义不一致。**
   - 配置缺失和删除未二次确认时，真实动作是 `clarify`，不是继续 `read` 或 `move-or-delete`。
   - 已修正 b15、b16 夹具，保留 100% 安全硬门禁。

4. **黄金输入不足以满足生产契约。**
   - b01 补充明确归属项目，避免 target-path 门控随机阻塞。
   - b08 补充 `recent_example`，满足系统诊断输入契约。
   - b11 明确“先收束主题，再写大纲”，避免与系统诊断路由争抢。

5. **无 Hub 契约时的 Trace 语义不明确。**
   - `不应触发` 统一为 `contract_id=null`、`final_action=none`，Hub 的 required chain/outputs/progress 为空。
   - `不确定` 统一为 `contract_id=null`、`final_action=clarify`，Hub 的 required chain/outputs/progress 为空。

6. **条件步骤与 fallback ID 不够机器可判定。**
   - `required_chain` 现在只允许生产契约的 `required_steps`；条件步骤只写入 `executed_conditional_steps`。
   - fallback 必须逐字使用生产契约 ID，不得追加 `/search` 等动作后缀。

### 尚存但不阻塞本次发布的风险

- 当前 Codex Desktop 工具终端中，从 PowerShell runner 再启动 `codex exec` 会报 `stdin is not a terminal`；本次使用直接、隔离、只读的 `codex exec` 生成 51 份原始结果，再由正式 runner 的 `RawResultsPath` 模式统一评分。
- `RunTimeoutSeconds` 参数目前仍由外层命令执行器负责，没有在 runner 内部强制终止子进程。后续可在不破坏 Windows TTY 的前提下补齐超时控制。
- `artifacts/` 被 Git 忽略；原始结果、评分报告和发布 ZIP 仅保存在当前工作区。关键摘要和 SHA-256 已写入本报告。

## 3. 自动验证结果

### 结构与上下文

命令：

```powershell
& '.\scripts\validate-test-prompts.ps1'
```

结果：通过。

- 路由契约：8 个场景；
- 能力契约：12 个能力；
- 三层测试：intent 16、route 8、e2e 9、gates 5；
- 行为用例：17；
- 固定上下文：`7496 / 10000 bytes`；
- Progress Map 必选和条件步骤覆盖、显示顺序及唯一 ID 校验通过。

### 初始化成功仪式

命令：

```powershell
& '.\scripts\verify-init-success.ps1'
```

结果：`PASS=6 FAIL=0 SKIP=1 / total 7`。唯一 SKIP 是未启用 `-CheckFileSystem` 时预期跳过的真实路径存在性案例。

### 真实行为门禁

原始结果由 51 个隔离、只读、无副作用的 `codex exec` 会话生成；评分命令：

```powershell
& '.\scripts\run-hub-behavior-eval.ps1' `
  -Runs 3 `
  -RawResultsPath 'artifacts/hub-eval/raw-v0.6.0' `
  -ReportPath 'artifacts/hub-eval/latest-v0.6.0.json'
```

最终结果：

- 综合分：`100 / 100`；
- 运行通过率：`51 / 51 = 100%`；
- 连续成功率：`17 / 17 = 100%`；
- 安全通过率：`100%`；
- 质量门禁：`True`。

评分报告：`D:\aiCoding\projects\second-brain\artifacts\hub-eval\latest-v0.6.0.json`

- 大小：312,824 bytes；
- SHA-256：`D12E109680C569A4829AD270BD9EA12F2BF48A587B2FBF32F379A65E66D2259A`。

### SkillHub 发布包

命令：

```powershell
& '.\scripts\build-skillhub-package.ps1'
```

结果：通过。

- 可发现 Skill：1 个，`second-brain-hub`；
- 隐藏安装依赖：5 个；
- ZIP 条目：35；
- ZIP 根目录：仅 `second-brain-hub/`；
- 反斜杠路径条目：0。

发布包：`D:\aiCoding\projects\second-brain\artifacts\skillhub\second-brain-hub.zip`

- 大小：43,239 bytes；
- SHA-256：`9A7B82280A31CCCCB943BC4D0897A3B23ABBA49E28E065CB71D59B0396681184`。

### Git 检查

- `git diff --check`：通过；
- PR 基线到候选的 8 场景实现、外部评测和安全门禁已人工复核；
- tag 前必须再次确认工作区干净、feature 与远端同步、`main` 包含候选提交。

## 4. 发版操作顺序

1. 将本报告提交并推送到 `feat/progress-map-cards-main`。
2. 确认 GitHub PR 的最终 diff 仍是 `origin/main...origin/feat/progress-map-cards-main`，且无新冲突。
3. 合并 PR 到 `main`。
4. 拉取并核对本地 `main` 与 `origin/main` 完全同步。
5. 在合并后的 `main` 提交创建 annotated tag：`v0.6.0`。
6. 推送 `v0.6.0` 到 `origin`，再用远端 tag SHA 验证落点。

## 5. 明日接手最短路径

如果 tag 尚未完成，从这里继续：

```powershell
git fetch origin
git status --short --branch
git log --oneline 'origin/main..origin/feat/progress-map-cards-main'
git diff --check origin/main...origin/feat/progress-map-cards-main
```

确认报告提交在 feature 分支、PR 已合并且测试没有新变化后，按第 4 节完成 `v0.6.0`。不要把 tag 直接打在未合并的 feature 分支上，也不要用仓库中历史 `tests/hub/eval-results/behavior-report.json` 代替本次真实报告。

## 6. v0.6.0 后续：统一初始化 SOP

### 当前状态

- `v0.6.0` 已落在 `main@33ea17a`；本节是 tag 之后的新改动，不能继续复用 `v0.6.0`。
- 工作分支：`codex/unify-onboarding-setup-sop`。
- 已推送提交：`2a23622`（实现）与 `8dad06e`（交接记录）；本地与 `origin/codex/unify-onboarding-setup-sop` 同步。
- PR 创建入口：`https://github.com/StarDust-AI-Labs/second-brain-skills/pull/new/codex/unify-onboarding-setup-sop`。当前机器没有可复用的 GitHub API 登录，自动创建停在授权前；公开查询确认截至本记录写入时尚无开放 PR。
- 目标：提示词安装完成后与手工复制 Skill 后的首次 Hub 调用，都完整执行已安装的 `second-brain-hub/SETUP.md`。
- 真实边界：通用手工复制没有统一的安装后钩子，因此它在第一次调用 Hub 时进入同一 SOP；提示词安装则在复制完成后直接执行该 SOP。

### 已完成改动

- `SETUP.md` 成为安装、首次运行、重设和配置修复的唯一初始化事实源。
- `workflow-onboarding.md` 只保留运行时适配职责：暂存 `pending_request`、调用 `SETUP.md`、接收统一结果、重新通过业务写入门控并恢复原请求。
- 中英文 README 的安装提示词均委托已安装的 `second-brain-hub/SETUP.md`，不再重复初始化实现，也不创建合成测试笔记。
- 新增安装入口与运行时入口共用 `SETUP.md` 的 onboarding 夹具，并在主验证器中阻止两套流程再次漂移。
- `setup_trigger` 已定义为运行台账/调用上下文中的瞬时字段：安装后、运行时缺配置、显式重设分别使用可机器判定的三个值；显式重设直接进入 `SETUP.md`，不经过 onboarding 适配层。
- 中英文 README 安装提示词恢复更新模式、覆盖前备份授权、保留 `hub-state.json`、未知来源同名 Skill 保护和逐项能力降级报告；主验证器对两种语言执行对称白名单检查。

### 本轮验证

- Skill 结构：`quick_validate.py` 通过。
- 初始化成功验证：`PASS=6 FAIL=0 SKIP=1`，唯一 SKIP 是未启用真实文件系统检查时的预期项。
- 主结构验证：通过；onboarding 用例 23 个，固定上下文 `7607 / 10000 bytes`。
- 安装入口、运行时入口和显式重设入口的 onboarding 用例属于结构性契约验证；它们证明统一 SOP、trigger 和恢复语义存在，不等同于真实 Agent 执行。运行时行为层由 `b15 x 3` 定向会话兜底。
- 真实行为：缺配置用例 `b15 x 3` 由独立只读 `codex exec` 会话生成，再用正式评分器复核；综合分、运行通过率、连续成功率和安全率均为 `100%`，质量门禁为 `True`。
- `git diff --check`：通过。
- 当前发布 ZIP：`D:\aiCoding\projects\second-brain\artifacts\skillhub\second-brain-hub.zip`，43,572 bytes，SHA-256 `CC3A2575EB44DD9008F4BFDC771F5CE3919D78F282FE977C62A20FB010C9AEB7`。
- ZIP 审计：35 个条目，仅含 `second-brain-hub/`，包含 `SKILL.md` 与 `SETUP.md`，无测试文件、测试标记或反斜杠路径。

### 合并与下一 tag

1. 审查并合并 `codex/unify-onboarding-setup-sop` 的 PR。
2. 在合并后的 `main` 上重新运行初始化验证、主结构验证、打包和 ZIP 审计。只有以下命令返回退出码 0，才能认定合并树相对已审查远端分支在发布相关文件上“无新增变化”，并复用本节的 `b15 x 3` 定向行为报告：

   ```powershell
   git diff --quiet origin/codex/unify-onboarding-setup-sop..main -- README.md README.en.md skills tests scripts
   ```

   若发生 rebase、冲突解决或上述 diff 非空，必须重新生成受影响行为用例；下一次完整发版仍应按发布门禁决定是否重跑全部 17 个行为用例。
3. 根据本次发布范围确定新 tag；若只包含本兼容修复，建议 `v0.6.1`。不得移动或覆盖现有 `v0.6.0` tag。
4. 只在合并后的 `main` 提交创建并推送新 tag，随后核对远端 tag SHA 和最终 ZIP 哈希。
