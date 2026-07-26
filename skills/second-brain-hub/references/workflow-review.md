# 回顾整理工作流

契约：`review`。

1. 确认周回顾、月回顾或项目收尾。
2. 调用 `obsidian-cli/list-search` 获取近期笔记、收件箱和活跃项目。
3. 读取 `module-knowledge-lifecycle.md`，输出发现、优先事项和需要回收的半熟素材。
4. 若发现可复用产物，读取 `module-intermediate-packets.md` 形成素材包；这是回顾内的能力组合，不改变路由必选链。
5. 调用 `obsidian-markdown` 渲染标准回顾笔记。
6. 完成写入前置后调用 `obsidian-cli/create`。
7. 可选：用户表达定期回顾意愿时，按 `hub-state.json` 的 `weekly_review_day` 偏好提议下一次回顾时间，经用户确认后使用当前 Agent 平台的定时提醒能力创建提醒；平台不支持或用户未确认时跳过，不阻塞场景。

## 步骤痕迹

地图卡每个显示步骤完成后留下的可见痕迹（显示步与顺序见 `route-contracts.json` 的 `progress_map`）：

- 收集周期笔记：周期范围与笔记数量。
- 归纳主题：主要发现与优先事项。
- 回收可复用素材：回收的素材包；无可回收时展示跳过证据。
- 生成回顾：回顾笔记标题。
- 写入归档：Vault 内实际路径。

必需输出：`review_scope`、`review_findings`、`final_markdown`、`target_path`。
