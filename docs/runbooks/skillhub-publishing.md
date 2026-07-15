# SkillHub 发布运行手册

## 发布模型

- 商店公开条目：`second-brain-hub`。
- 隐藏安装依赖：`defuddle`、`json-canvas`、`obsidian-bases`、`obsidian-cli`、`obsidian-markdown`。
- 隐藏依赖随父 Skill 安装，但不生成独立商店条目。
- 运行时缺少依赖时，按 `references/dependency-resolution.md` 降级，不因单个工具缺失禁用整个 Hub。

## 构建上传目录

在仓库根目录执行：

```powershell
.\scripts\build-skillhub-package.ps1
```

默认输出：

```text
artifacts/skillhub/second-brain-hub/
```

该目录只包含一个可发现的 `SKILL.md`。将此目录提交给 SkillHub，不要直接让商店递归扫描仓库根目录的 `skills/`。

## 安装器要求

SkillHub 安装器必须读取 `dependencies.json`：

1. 安装父目录中的 `second-brain-hub`。
2. 从每个依赖的 `source.repository + source.path` 获取依赖。
3. 将依赖安装到用户 Agent 的同级 Skill 根目录。
4. `visibility=hidden` 的依赖不创建商店条目。
5. 单个依赖安装失败时报告失败项；Hub 仍可按依赖协议尝试降级。

如果 SkillHub 当前不解析 `dependencies.json`，需要先为商店安装器增加这一解析能力；单独上传目录本身无法主动把其他 Skill 写入用户的 Agent 环境。
