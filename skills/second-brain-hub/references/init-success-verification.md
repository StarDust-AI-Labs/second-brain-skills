---
name: second-brain-init-success-verification
description: 知识库初始化成功的机器校验规则。任何 Agent / 评测脚本 / 测试可据此解析初始化输出中的 second-brain-init 标记块，判定初始化是否真正完成。随 second-brain-hub 安装，保证跨平台一致。
---

# 第二大脑 · 初始化成功校验规则

> 用途：当初始化流程输出「成功卡片」后，用本规则做**机器可校验**的成功判定。
> 人看的仪式感文案不参与判定；判定只依据隐形的 `second-brain-init` JSON 标记块。

## 1. 定位标记块

在 Agent 输出文本中，查找以下 HTML 注释块：

```
<!-- second-brain-init
{ ...JSON... }
-->
```

- 起始标记：`<!-- second-brain-init`
- 结束标记：`-->`（注释块内第一个出现的）
- 两者之间是一段 JSON。

**参考正则**（`.` 需匹配换行）：

```
<!--\s*second-brain-init\s*([\s\S]*?)\s*-->
```

捕获组 1 即为 JSON 文本，交给标准 JSON 解析器解析。

## 2. 判定成功的必要条件

解析出的 JSON 必须**同时满足**：

| 字段 | 要求 |
|------|------|
| `status` | 必须等于 `"success"` |
| `version` | 必须为受支持版本，当前为 `"1"`；遇到未知版本应判为"未识别"，不要静默当作成功 |
| `storage_mode` | 必须为 `"obsidian"` 或 `"markdown"` 之一 |
| `workspace_path` | 非空字符串，且为绝对路径（不校验路径是否真实存在，由初始化流程保证） |

任一条件不满足 → 判定为「初始化未完成 / 仪式卡非法」。

## 3. 注意

- **失败时不得出现成功标记**：存储配置写入失败时，输出中不得包含 `status:"success"` 的标记块（见 `workflow-onboarding.md` 第 4 步：`onboarding.completed` 保持 `false`，不留成功回执）。
- **逐字一致**：所有平台输出同一模板（见 `init-success-card.md`），因此本校验规则在任何平台通用。
- 校验只认标记块，不解析烟花文案、不依赖任何平台专属语法。
