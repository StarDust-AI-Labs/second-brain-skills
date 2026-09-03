---
source: PR #16 review (round 2)
captured: 2026-08-27 22:55
project: 第二大脑体系搭建
status: active
tags: [second-brain-hub, PR16, code-review, stability, file-safety]
distill_level: 1
related: "[[PR16-Hub-Runtime-review-2026-08-25]]"
---

# PR #16 Hub Runtime 第二轮评审（2026-08-27）

> [!core] 结论
> **Request Changes，暂不可合并。** 上一轮 9 项问题中 6 项已实修且质量良好，但新增的 runtime 写入执行器与遗留的 `commit` 命令、旧协议文档互相矛盾，导致：测试套件在 PR head 上 3/40 失败、按文档执行的黄金路径必死。修复方向明确，工作量集中在收敛而非重写。

## 需求背景

PR 目标：把第二大脑场景的「自然语言契约」升级为可验证的运行时协议，解决「agent 能识别场景但自主跳过流程」的问题。本轮评审前该 PR 已收到一轮 Request Changes（2026-08-25，9 项问题）与一条实测反馈（v1.0.7 升级后 hub-state.json 旧结构不兼容、--template-file 未文档化）。PR head 现为 `3122d53`（2026-08-25 23:15），上一轮评审基线为 `f831b9b`，此后新增约 1100 行：runtime `write` 命令（实际执行文件操作）、`gates.mjs`/`state.mjs` 加固、`install.mjs`（485 行安装器）及新测试。

## 上轮 9 项问题核销状态

| # | 上轮问题 | 状态 |
|---|---|---|
| 1 | P0 Runtime 是旁路记账器 | 🟡 部分解决：`write` 命令成为实际写入方（带前后 SHA-256、runtime_write_id 回执）；但协议文档矛盾 + commit 死代码使黄金路径断裂（见阻塞项 2/3） |
| 2 | P1 符号链接/Junction 越界 | ✅ 已解决：`realPathInsideRoot` 用 `realpathSync` + 逐级 `lstatSync`，且 `cmdWrite` 写前重新校验 |
| 3 | P1 commit 不能证明写入 | ✅ 语义已改强（要求 `runtime_write_id === ledger.write.id` + 目标存在性检查）；但引出阻塞项 2 |
| 4 | P1 模板门禁可被空文件绕过 | 🟡 preflight 侧已严格校验（frontmatter 5 必需字段 + 标题）；write 实际内容仍不校验（建议 4） |
| 5 | P1 删除确认是可伪造布尔 | ✅ 已改为 preflight 签发一次性 `confirmation_token`；但 `--auth` 文档参数实际无效（可选 9） |
| 6 | P1 run_id 穿越 / 台账并发损坏 | ✅ 已解决：run_id 强制 `^run-\d{14}-[0-9a-f]{6}$`，临时文件 + 原子 rename + `wx`；并发丢更新仍存（建议 7） |
| 7 | P1 配置未完全 fail-closed | ✅ 已解决：mode 枚举、名称、绝对路径、目录存在且非符号链接全校验 |
| 8 | P2 协议文档压成单行 | ✅ 已恢复逐项格式 |
| 9 | P2 条件步骤顺序不严 | ✅ 已解决：`cmdStep` 对 step_order 全序校验 + preflight 前置校验——副作用是弄坏了 2 个旧测试（阻塞项 1） |

## 🔴 阻塞问题

### 1. 测试套件在 PR head 上是红的（3/40 失败）

实测 `node --test "tests/hub/runtime/*.test.mjs"`：**37 pass / 3 fail**，PR 描述声称 37 pass / 0 fail。失败用例：

- `flow.test.mjs:32` 黄金路径：期望旧 commit 报错文案 `receipt target missing`，实际新语义报 `commit requires a Runtime-generated write receipt`
- `flow.test.mjs:129` 条件未结算：`cmdStep` 新增的全序校验使 `obsidian-markdown` 因 `capture-criteria` 未结算被拒，测试未随之更新
- `flow.test.mjs:178` 提炼结算：外部回执 `{"operation":"edit"}` 被新 commit 拒绝，exit 1 ≠ 0

**影响**：CI 若接入将直接失败；「验证」章节与实际不符，违反本仓库证据导向惯例。
**修改意见**：新语义是正确方向，应更新这 3 个测试为新行为（外部回执被拒、全序校验生效），并恢复全绿后在 PR 描述修正验证记录。

### 2. `commit` 命令成为死代码，三份协议文档互相矛盾

- `cli.mjs:265` 要求 `receipt.runtime_write_id === ledger.write?.id`，但 `ledger.write` 只在 `cmdWrite` 内设置，且同一函数随即转入 `WRITE_COMMITTED`；`cmdCommit` 又要求 `state === "PREFLIGHTED"`（`cli.mjs:254`）→ **commit 永远无法成功**。实测：runtime write 后带正确 `runtime_write_id` 调 commit，仍被 `cannot commit in state WRITE_COMMITTED` 拒绝。
- `SKILL.md` 第 7 步与 `references/writing-pipeline.md` 仍指导「调用外部写入工具（obsidian-cli）→ commit 登记 `{tool:"obsidian-cli",...}` 回执」的旧流程——按这两份文档执行的 agent 会在 commit 处被 `commit requires a Runtime-generated write receipt` 拒绝，流程必死。
- `references/runtime-protocol.md` 则声明 direct filesystem writes 不满足契约。三处冲突使 agent 无所适从，恰是本 PR 要解决的「自主跳过/不稳定执行」问题。

**修改意见**：二选一并全链路统一——
- 方案 A（推荐）：删除 `commit` 命令与外部回执路径，`write` 全权负责；同步改写 `SKILL.md` 第 7 步、`writing-pipeline.md` 的「运行时执行位」、`hub-runtime.mjs` 头部注释。
- 方案 B：保留双通道（runtime write / 外部写入 + 经核验的 commit），则需撤销 commit 的 state 前置或另行登记 `ledger.write`。

### 3. runtime write → finish 黄金路径断裂（无测试覆盖）

`write.test.mjs` 只断言到 write 成功，未测 finish。实测完整链路（preflight → write → finish）：**finish exit 1，missing: `required output missing: target_path`**。inspiration 契约要求 `target_path` 输出，黄金路径测试里靠 `step --output target_path=...` 登记；而 `runtime-protocol.md` 第 5 条 write 命令说明完全没提需要 `--output`，按文档执行的 agent 无法完成运行。

**修改意见**：在 `cmdWrite` 成功后自动登记 `target_path`（及 `source_path`）到 `ledger.steps.outputs`；或至少在 runtime-protocol.md write 条目中明确 `--output` 要求。补一条 preflight → write → finish 的端到端测试。

## 🟡 建议问题

### 4. 模板门禁与实际写入内容脱钩

实测：preflight 用合法 `--template-file`（含完整 frontmatter）取得 write_allowed 后，`write --content "garbage without frontmatter"` exit 0，落盘内容无 frontmatter。模板门禁校验的 artifact 与实际写入的 artifact 不是同一份，对 runtime write 而言形同虚设。

**修改意见**：`cmdWrite` 对 create/edit 的 `--content`/`--content-file` 执行与 `gateTemplate` 相同的 frontmatter 校验，或校验写入内容与登记模板一致（如哈希比对）。

### 5. hub-state.json 旧平铺结构无迁移（PR 实测反馈 #1 未解决）

`install.mjs makeHubState` 只对全新安装写嵌套 `preferences`；update 模式原样保留旧文件（`copySkillSet` 恢复 existingState）。旧版平铺字段（workspaceType + vaultPath）用户升级后 `start` 仍 `config_ok=false` 卡死。

**修改意见**：`readConfig` 或 install update 模式检测平铺结构并自动迁移到嵌套 `preferences`；至少在 SETUP.md 明示需补充 preferences 块。

### 6. 单次运行只允许一次写入，与真实工作流冲突

状态机 `PREFLIGHTED → WRITE_COMMITTED` 后无法再次 preflight/write。真实工作流（写笔记 + 回写 Vault 内 `hub-state.json` 的 last_operations）需要两次写入。agent 只能在运行外直写 hub-state.json——违反「禁止绕过运行时直接读写 Vault」（SKILL.md 第 12 行），制造新的绕过通道或流程死锁。

**修改意见**：支持单 run 多轮 `preflight → write`（WRITE_COMMITTED 允许回到 PREFLIGHTED，或引入 WRITING 子状态）；或明确豁免 `<state-dir>` 下运行时自身管理文件。

### 7. 并发丢失更新

`saveLedger` 原子化已修，但同一 run 的并发命令仍是 read-modify-write、last-write-wins：两个并行 `step` 会静默丢失其中一个。

**修改意见**：run 级锁文件（`O_EXCL` + 过期清理）或台账版本号 CAS（读时记 rev，写时校验不一致则重试/拒绝）。

## 💭 可选改进

8. `realPathInsideRoot` 在 root 不存在时返回 `pass:true`（gates.mjs:31）——start 时已校验，但运行中 root 被删的 TOCTOU 场景会放行，建议直接 fail。
9. 协议文档写 `--auth`，实现读取的是 `--confirmation`（cli.mjs:225）；`--auth` 不在 BOOL_FLAGS 还会吞掉后续参数值。统一为一个参数名并加入 BOOL_FLAGS 或改为显式取值。
10. runtime-protocol.md 称回执 "signed receipt"，实际是随机 ID 并未签名。改为 HMAC（密钥存 state-dir）或修正措辞。
11. `cmdWrite` edit 场景未校验内容确实变化（before/after sha 相同也提交）；孤儿 `.<run>.tmp` 文件无清理；`gateTargetPath` 的 `includes("..")` 会误伤文件名含 `..` 的合法文件（保守方向可接受，建议注释说明）。

## 值得肯定的设计

- 状态机 + 失败关闭门禁架构清晰，`checkWriteGate` 五重校验（run 存在/未阻塞/preflight/令牌/路径一致）是好模式。
- `cmdWrite` 记录前后 SHA-256、runtime_write_id 一次性回执，使虚报写入在协议层不可行。
- 逐级 lstat + realpath 双重校验、写前重校验，符号链接/Junction 逃逸防护到位。
- `install.mjs` 的 dry-run 默认、update 模式自动备份、hub-state.json 保留策略设计稳健，配套 `install-script.test.mjs` 通过。

## 合并前必须解决的事项清单

1. 🔴 收敛写入路径：删除或修复 `commit` 命令（方案 A/B），统一 `SKILL.md` 第 7 步、`writing-pipeline.md`、`runtime-protocol.md`、`hub-runtime.mjs` 注释四处描述。
2. 🔴 修复 3 个失败测试（更新为新语义），恢复全绿，修正 PR「验证」章节。
3. 🔴 打通 runtime write → finish：write 自动登记 `target_path` 输出，补端到端测试。
4. 🔴 明确单 run 单写入限制与 hub-state.json 回写的兼容方案（多轮写入或豁免条款）。
5. 🟡 write 内容 frontmatter 校验（建议 4）。
6. 🟡 hub-state.json 旧结构迁移（建议 5，PR 实测反馈）。

## 验证记录

- 环境：Windows 11，Node v22.22.2，PR head `3122d53`（=origin/feat/hub-workflow-stability，2026-08-25 23:15）
- `node --test "tests/hub/runtime/*.test.mjs"`：40 tests，37 pass / **3 fail**（明细见阻塞项 1）
- `node tests/install-script.test.mjs`：PASS
- 对抗性复现：无 frontmatter 内容写入成功（阻塞项外的建议 4）；runtime write 后 commit 被拒（阻塞项 2）；write→finish 失败 `required output missing: target_path`（阻塞项 3）
