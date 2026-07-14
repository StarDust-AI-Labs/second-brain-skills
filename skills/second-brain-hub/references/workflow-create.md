# 创作启动工作流

契约：`create`。

1. 确认主题、产物形式和当前卡点。
2. 出现持续收集、方向过多、无法收束、完美主义或长期停滞信号时，读取 `module-diverge-converge.md`；否则记录跳过证据。
3. 调用 `obsidian-cli/search` 检索相关笔记。
4. 读取 `module-intermediate-packets.md`，形成可用素材包和素材缺口。
5. 任一选中素材低于 L2 时读取 `module-progressive-summarization.md` 执行 L2；全部已达到 L2 时记录跳过证据。
6. 读取 `module-creative-workflow.md`，根据开始、持续或收尾卡点产出可继续推进的中间产物和海明威之桥。
7. 调用 `obsidian-markdown` 渲染项目笔记。
8. 完成写入前置后调用 `obsidian-cli/create`。

必需输出：`usable_packets`、`outline_or_next_artifact`、`hemingway_bridge`、`target_path`。
