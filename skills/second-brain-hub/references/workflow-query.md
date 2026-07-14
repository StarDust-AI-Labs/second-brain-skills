# 探索查询工作流

契约：`query`。

1. 明确关键词、时间范围或项目范围。
2. 调用 `obsidian-cli/search`，按相关性展示结果和 Vault 内路径。
3. `hub-state.json` 配置了 `twelve_problems` 时，读取 `module-twelve-favorite-problems.md` 标注长期兴趣关联；未配置时记录跳过证据。
4. 查询默认只读，不因找到结果而自动修改笔记。

必需输出：`search_results`。
