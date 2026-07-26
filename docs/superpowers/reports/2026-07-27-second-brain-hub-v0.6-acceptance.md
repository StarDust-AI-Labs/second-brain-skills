# second-brain-hub v0.6.0 验收与交接

- 日期：2026-07-27
- 候选分支：`feat/progress-map-cards-main`
- 基线：`origin/main` at `147e0b974f8e7ed5093658a2dd434db412337327`
- 已验证候选：`8f430f9`（包含评测夹具最终修正；本报告提交在其后）
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
- 固定上下文：`7495 / 10000 bytes`；
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
- SHA-256：`048ED7C0FB9273177474C3715A14AEEB612F12F86409A4C2FC6EA1DC43D71211`。

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

- 大小：43,254 bytes；
- SHA-256：`7BBBFE1BA17EEE8DC475D8F209B22C421741A152BF8DBD4A9B4147ACEBAE01B5`。

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
