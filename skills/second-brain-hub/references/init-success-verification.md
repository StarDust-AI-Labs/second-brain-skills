---
name: second-brain-init-success-verification
description: 知识库首次初始化成功的校验规则。区分两层——(A) 校验 Agent 输出格式是否合法；(B) 核对本地真实状态判定初始化是否真正完成。真正的"成功"以 (B) 为准，(A) 单独成立不代表初始化完成。随 second-brain-hub 安装。
---

# 第二大脑 · 初始化成功校验规则

> 关键区分：
> - **(A) 输出格式校验**：Agent 输出里的 `second-brain-init` 标记块是否**格式合法**。它只证明"Agent 输出了一张格式正确的成功卡"，**不能单独证明初始化真的完成**。
> - **(B) 真实状态校验**：核对本地 `hub-state.json` 与工作区目录，判定初始化**是否真正发生**。这才是"成功"的判据。
>
> Agent 可能提前或错误地输出成功卡，因此**判定成功必须以 (B) 为准**。

---

## (A) 输出格式校验

> 读取对象：Agent 的**原始输出文本**（raw output），不是渲染后的页面文本。

### A.1 定位标记块

在原始输出中查找 HTML 注释块：

```
<!-- second-brain-init
{ ...JSON... }
-->
```

参考正则（`.` 需匹配换行）：

```
<!--\s*second-brain-init\s*([\s\S]*?)\s*-->
```

捕获组 1 交给标准 JSON 解析器解析。**解析失败（含 Windows 单反斜杠导致的非法转义）即判为格式非法。**

### A.2 格式合法的必要条件

| 字段 | 要求 |
|------|------|
| `status` | 等于 `"success"` |
| `version` | 为受支持版本，当前为 `"1"`；未知版本判为「未识别」，**不得静默当作成功** |
| `storage_mode` | `"obsidian"` 或 `"markdown"` 之一 |
| `workspace_path` | 非空字符串，且为合法 JSON 字符串（反斜杠已转义为 `\\`） |

> ⚠️ (A) 全部通过，仅表示"卡片格式合法"，**进入 (B) 才能判定成功**。

---

## (B) 真实状态校验（判定成功的依据）

在能访问用户本地文件的环境（仓库测试脚本 / 评测 harness）中执行，逐项核对：

1. `hub-state.json` 存在且为合法 JSON。
2. `hub-state.json` 中 `onboarding.completed == true`。
3. `hub-state.json` 中 `preferences.storage_mode` 与标记块的 `storage_mode` 一致。
4. `hub-state.json` 中 `preferences.workspace_path`（或 `vault_path`）与标记块的 `workspace_path` 一致。
5. 该 `workspace_path` 在文件系统中**真实存在**。
6. 新建工作区时，五个 PARA 目录（📥 收件箱 / 📂 项目 / 📂 领域 / 📂 资源 / 📦 存档）真实存在。
7. Obsidian 模式下，`.obsidian/` 标记目录存在。

**全部通过才判定"初始化真正成功"；任一项失败即判为未完成。**

---

## 关于 HTML 注释与跨平台（边界说明）

- 机器标记使用 HTML 注释 `<!-- ... -->`。HTML 注释**不属于纯 Markdown 子集**，不同 Agent 客户端可能保留、剥离、显示它，或改变其空白。
- 因此本校验**统一规定读取"原始 Agent 输出"**，不读取渲染后的页面文本；在此前提下用上面的正则提取。
- **不宣称"所有平台逐字一致"**：仪式文案目标是跨平台一致，但机器校验的可靠性以"能拿到原始输出"为前提。
- 若某平台只提供渲染后内容、且会剥离 HTML 注释，则该平台无法靠 (A) 提取标记，应**退回 (B) 直接核对本地状态**（B 不依赖注释是否被保留）。

---

## 失败与防重复

- **失败不得出现成功标记**：配置写入失败、路径未确认、第一条笔记未写入成功时，输出中不得包含 `status:"success"` 标记块。
- **一次首次使用只出一张完整成功卡**：成功卡由 `output-cards.md`「首次成功」统一输出；输出后 `onboarding.first_success_at` 写入当前时间、`examples_shown=true`，后续不再重复输出。
