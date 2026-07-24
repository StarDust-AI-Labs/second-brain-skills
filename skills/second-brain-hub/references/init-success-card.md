---
name: second-brain-init-success-card
description: 知识库首次初始化成功后的"仪式感"交付卡片模板（唯一事实源）。workflow-onboarding.md 在存储配置写入成功后读取本模板，替换占位符后逐字输出，不得增删任何字符。上半部分是给用户看的仪式感文案；下半部分 HTML 注释内嵌 second-brain-init JSON，供跨平台机器校验。
---

# 第二大脑 · 初始化成功卡片（逐字模板）

> **给 Agent 的使用规则**
> 1. 仅当存储配置真正写入成功（`onboarding.completed=true`）后，才允许输出本卡片。
> 2. 把下方 `<占位符>` 替换为本次初始化的真实值，其余字符**一字不改**地输出。
> 3. 全文只用跨平台纯 Markdown 子集（加粗 / 列表 / 反引号 / emoji），不出现任何 Agent 或平台名称，保证多平台逐字一致。
> 4. 末尾 HTML 注释块必须原样保留（含 `second-brain-init` JSON），它对用户隐形、供机器校验；不要删除、不要改成可见代码块。

---

🎉 **你的第二大脑，搭建完成！**

✨ 知识库已就位：`<workspace_path>`
📦 存储方式：<storage_mode_text>

从现在起，对我说话就行：
- **记一下**…… —— 随手记下灵感
- **保存这篇文章** <链接> —— 帮你存网页
- **帮我提炼这篇** —— 读出精华
- **基于我的资料写个大纲** —— 开始创作

🔒 所有笔记都在你自己的电脑里，是普通文本文件，永远是你的。

**记录交给我，创造留给你。** 🚀

<!-- second-brain-init
{"status":"success","version":"1","storage_mode":"<storage_mode>","workspace_path":"<workspace_path>"}
-->
