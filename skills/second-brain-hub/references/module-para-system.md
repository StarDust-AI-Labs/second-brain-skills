# PARA 归属

输入：`content_summary`、`active_projects`、`existing_folders`。输出：`target_folder`、`classification_reason`、`project_or_area`。

按 P → A → R → A 判断：

1. Project：是否直接推动一个有明确结果和期限的项目。
2. Area：是否支持一个需要持续维持的责任领域。
3. Resource：是否是未来可能有用的主题资料。
4. Archive：是否已经失去当前行动价值但需要保留。

分类以“下一次为了什么结果找到它”为准，不以文章主题或文件类型为准。

<HARD-GATE id="outcome-before-category">
未先判断内容服务的结果或责任，不得仅凭主题名称决定 PARA 分类。
</HARD-GATE>

<HARD-GATE id="target-path-before-write">
未输出明确且非 Vault 根目录的 `target_folder` 前，不得进入写入、更新或移动步骤。
</HARD-GATE>
