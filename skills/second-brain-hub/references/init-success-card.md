---
name: second-brain-init-success-card
description: 首次成功（首次配置完成 + 第一条笔记写入成功）时的仪式感交付卡片模板（唯一事实源）。由 output-cards.md 的「首次成功」节引用，仅当 onboarding.completed=true 且第一条笔记真实写入成功后输出一次。上半部分是给用户看的仪式感文案；下半部分 HTML 注释内嵌 second-brain-init JSON，供跨平台机器校验。
---

# 第二大脑 · 首次成功卡片（逐字模板）

> **给 Agent 的使用规则**
> 1. **触发时机**：仅当知识库首次配置完成、且用户原始请求产生的第一条笔记**真实写入成功**后，输出一次。配置写入失败、路径未确认、或笔记未写入成功时，**不得输出**本卡片。
> 2. **逐字一致**：把下方 `<占位符>` 替换为真实值，其余字符一字不改，不出现任何 Agent 或平台名称。用户可见部分使用跨平台 Markdown；机器标记使用 HTML 注释，其可用性依赖平台能够保留并提供**原始 Agent 输出**。
> 3. **JSON 必须合法**：末尾 `second-brain-init` 块必须是一段**合法 JSON**。生成时用当前环境的 JSON 序列化能力构造，禁止用普通字符串直接拼接路径。
> 4. 末尾 HTML 注释块原样保留，它对用户隐形、供机器校验；不要删除、不要改成可见代码块。

## ⚠️ 路径转义（硬规则）

路径在卡片里出现**两次**，必须用**两个不同占位符**，禁止用一次全局替换同时填两处：

- **`<workspace_path_display>`**（用户可见处）：填**原始路径**，原样显示。
  例：`D:\Notes\Brain`、`/home/user/大脑`
- **`<workspace_path_json>`**（JSON 块内）：必须填**经 JSON 序列化后的字符串**。
  例：`D:\Notes\Brain` → `D:\\Notes\\Brain`；`/home/user/大脑` → `/home/user/大脑`

**禁止**手工拼接、或用简单字符串替换把原始路径直接塞进 JSON。Windows 单反斜杠（`\N`、`\B`）会被当成非法转义序列，标准解析器直接失败。生成 `<workspace_path_json>` 时用当前环境的 JSON 序列化能力处理。

---

🎉 **你的第二大脑，搭建完成！**

✨ 知识库已就位：`<workspace_path_display>`
📦 存储方式：<storage_mode_text>
📝 第一条内容已经保存好了

从现在起，对我说话就行：
- **记一下**…… —— 随手记下灵感
- **保存这篇文章** <链接> —— 帮你存网页
- **帮我提炼这篇** —— 读出精华
- **基于我的资料写个大纲** —— 开始创作

🔒 所有笔记都在你自己的电脑里，是普通文本文件，永远是你的。

**记录交给我，创造留给你。** 🚀

<!-- second-brain-init
{"status":"success","version":"1","storage_mode":"<storage_mode>","workspace_path":"<workspace_path_json>"}
-->
