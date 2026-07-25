---
name: second-brain-init-success-verification
description: 仓库测试层的首次初始化成功校验规则；不随 second-brain-hub 发布。
---

# 第二大脑 · 初始化成功校验规则

> 关键区分：
> - **(A) 输出格式校验**：Agent 输出里的 `second-brain-init` 标记块是否格式合法，只证明成功卡格式正确。
> - **(B) 真实状态校验**：核对本地 `hub-state.json` 与工作区目录，判定初始化是否真正发生；成功必须以此为准。

## (A) 输出格式校验

读取 Agent 原始输出文本并查找：

```text
<!-- second-brain-init
{ ...JSON... }
-->
```

参考正则：

```text
<!--\s*second-brain-init\s*([\s\S]*?)\s*-->
```

捕获组必须通过标准 JSON 解析，且满足：

| 字段 | 要求 |
|---|---|
| `status` | 等于 `success` |
| `version` | 当前支持 `1`；未知版本不得当作成功 |
| `storage_mode` | `obsidian` 或 `markdown` |
| `workspace_path` | 非空合法 JSON 字符串，Windows 反斜杠已转义 |

## (B) 真实状态校验

测试 harness 逐项核对：

1. `hub-state.json` 存在且为合法 JSON。
2. `onboarding.completed == true`。
3. 状态中的 `storage_mode` 与标记一致。
4. 状态中的 `workspace_path` 或 `vault_path` 与标记一致。
5. 工作区路径真实存在。
6. 新工作区的五个 PARA 目录真实存在。
7. Obsidian 模式下 `.obsidian/` 存在。

全部通过才判定真正成功。

## 跨平台边界

- 机器标记使用 HTML 注释；校验读取原始输出，不读取渲染后文本。
- 不宣称所有客户端逐字一致；客户端拿不到原始输出时，直接执行真实状态校验。
- 配置写入失败、路径未确认或第一条笔记未成功时，不得出现成功标记。
- 首次使用只输出一张完整成功卡；成功后写入 `first_success_at` 并设置 `examples_shown=true`。
