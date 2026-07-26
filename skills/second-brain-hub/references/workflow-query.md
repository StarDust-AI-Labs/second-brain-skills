# 探索查询工作流

契约：`query`。

1. 明确关键词、时间范围或项目范围。
2. 调用 `obsidian-cli/search`，按相关性展示结果和 Vault 内路径。
3. `hub-state.json` 配置了 `twelve_problems` 时，读取 `module-twelve-favorite-problems.md` 标注长期兴趣关联；未配置时记录跳过证据。
4. 查询默认只读，不因找到结果而自动修改笔记。

## 步骤痕迹

地图卡每个显示步骤完成后留下的可见痕迹（显示步与顺序见 `route-contracts.json` 的 `progress_map`）：

- 检索知识库：命中数量与代表性路径。
- 关联长期问题：关联到的长期兴趣；未配置 twelve_problems 时展示跳过证据。

必需输出：`search_results`。
