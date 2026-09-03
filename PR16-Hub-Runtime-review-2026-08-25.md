---
source: PR #16 review
captured: 2026-08-25 20:15
project: 第二大脑体系搭建
status: active
tags: [second-brain-hub, PR16, code-review, stability, file-safety]
distill_level: 1
---

# PR #16 Hub Runtime 工作流稳定性审意见稿

> [!core] 结论
> 建议暂不批准，状态为 Request Changes。现有 Runtime 测试通过，但尚未形成真正不可绕过的写入安全边界。

## P0 必须先修

### 1. Runtime 仍是旁路记账器，不能阻止直接写入

`preflight` 只签发令牌，`commit` 只记录回执；现有 `obsidian-cli` 和文件系统写入没有强制经过 Runtime 的代理或拦截。Agent 仍可直接调用写入工具，绕过 `run_id`、步骤凭证和 `write_allowed`。

建议把创建、更新、移动、删除实现为 Runtime 的实际操作命令，或让所有副作用工具统一调用 Runtime gate。必须增加端到端测试：直接调用写入工具而不经过 Runtime 时，操作应被拒绝。

## P1 高风险问题

### 2. Vault 内符号链接/Junction 可绕出存储根目录

路径检查只对 `path.resolve` 后的字符串做前缀判断，没有解析真实路径。Vault 内的 Junction/Symlink 指向外部目录时仍会被放行。建议使用真实路径校验并拒绝 reparse point；补充 Windows Junction 和符号链接逃逸测试。

### 3. commit 不能证明写入真实发生

当前只检查目标文件存在。create 场景中目标原本存在也能提交；edit 场景不验证内容变化；move/delete 场景没有验证源、目标或删除结果。回执 JSON 由调用方自行提供，可能伪造。建议由 Runtime 或工具适配层生成可信回执，并按操作类型验证前后状态。

### 4. 模板门禁可被任意存在的文件绕过

只要传入 `templatePath` 就可能通过，即使文件为空、没有 frontmatter 或缺少必需字段。建议始终读取并解析内容，严格校验 frontmatter 和正文结构。

### 5. 删除/移动确认只是可伪造的布尔参数

`--auth` 本身不能证明用户看过预览并确认具体文件。建议把确认绑定到源路径、目标路径、操作类型、预览快照和用户确认事件；批量删除必须基于明确的预览清单。

### 6. 运行台账存在路径穿越和并发损坏风险

`run_id` 直接拼入台账路径，缺少格式限制，可能访问 `hub-runs` 之外的文件。台账使用普通写入，没有原子替换、锁或崩溃恢复，并行命令可能互相覆盖。建议限制 `run_id` 为 `^run-\\d{14}-[0-9a-f]{6}$`，校验真实目录边界，采用临时文件加原子 rename，并增加并发与中断恢复测试。

### 7. 配置检查没有完全 fail-closed

Runtime 未严格限制 `storage_mode`，也未要求 `vault_name/workspace_name` 存在及路径确实为目录。非法或不完整配置可能进入可写流程。建议校验模式、名称、目录存在性和目录类型，失败时阻止可写场景。

## P2 稳定性与可维护性

### 8. 协议文档结构被压成单行

`SKILL.md`、`runtime-protocol.md` 中多个编号步骤和列表项被合并到同一行，降低 Agent 正确读取和执行协议的稳定性。建议恢复逐项换行，并增加 Markdown/协议结构校验。

### 9. 条件步骤没有严格校验顺序

`cmdStep` 只校验必选步骤顺序，条件步骤可以在后续必选步骤之后执行，和契约声明的严格顺序不一致。应补充条件步骤序列约束及回归测试。

## 验证记录

- `node --test tests/hub/runtime/*.test.mjs`：38 通过。
- `node tests/install-script.test.mjs`：通过。
- 对抗性检查已复现：符号链接越界、空模板绕过、布尔确认绕过均被当前实现接受。

## 开发 Agent 修改顺序

1. 先完成真正的 Runtime 写入代理或工具层强制拦截。
2. 再修复真实路径、回执验证、删除确认和台账原子性。
3. 补齐配置、模板、条件步骤和绕过路径的端到端测试。
4. 最后恢复协议文档格式并重新执行完整验收。
