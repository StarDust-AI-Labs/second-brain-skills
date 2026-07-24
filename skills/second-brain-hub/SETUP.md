---
name: second-brain-setup
description: 第二大脑知识库初始化引导（仅供 Agent 阅读执行）。当 hub-state.json 缺失、vault 配置无效，或用户明确表示"初始化/搭建/设置知识库"时使用。本文件不负责安装 Skill 本身，只负责 Skill 装好之后首次搭建个人知识库。
---

# 第二大脑 · 知识库初始化 SOP（Agent 专用）

> **这份文档是写给 AI Agent 看的，不是写给普通用户的。**
> 你的任务：带用户完成知识库的首次搭建——选定存储形态、建好 PARA 目录、写入 `hub-state.json`、做一次最小验证。
>
> **职责边界**：本 SOP 只管"Skill 装好之后的知识库初始化"。Skill 本身的安装由仓库 README 的安装提示词负责，不在这里。

---

## 给 Agent 的总原则

1. **全程大白话**：用户可能没有技术背景。每次只问一个问题，不堆术语。
2. **先检查再动手**：任何写入、建目录、改配置前，先说明要做什么、征得用户同意。
3. **不猜路径**：知识库路径必须由用户确认，禁止用默认路径、禁止建在磁盘根目录或用户主目录本身。
4. **保护已有数据**：发现已有 Vault 或已有 `hub-state.json` 时，优先沿用，不覆盖。
5. **可降级**：缺工具时用安全等价能力，缺 Node 时用文件工具兜底，不因此中断。
6. **隐私最小**：`hub-state.json` 是本地文件，绝不提交到 Git，绝不外发。

---

## 第 0 步 · 判断是否需要初始化

先只读检查 `second-brain-hub` 目录下的 `hub-state.json`：

- **存在且 `preferences.vault_path`（或 `workspace_path`）有效**（路径真实存在）→ 已有配置，**跳过本 SOP**，直接进入正常场景路由，并告诉用户"知识库已配置好，位置在 `<路径>`"。
- **不存在，或路径失效** → 进入下面的初始化流程。
- **存在但用户说"想换一个知识库位置"** → 先备份现有 `hub-state.json`，再走初始化，最后保留旧配置可回滚。

> ⚠️ 对应 SKILL.md 的 `vault-config` HARD-GATE：本步确认完成前，不得对任何 Vault 路径做读写。

---

## 第 1 步 · 探测环境（只读，不问用户）

安静完成以下探测，不要一条条问用户：

1. **是否已装 Obsidian**：检查常见安装目录、开始菜单、`/Applications`、`which obsidian`（按当前操作系统）。
2. **是否已有 Vault**：在常见位置（文档、桌面、用户主目录）只读探测**包含 `.obsidian/` 子目录**的文件夹，最多记 3 个候选。
3. **Node.js 是否可用**：`node --version` 能跑通即可。不可用则记下，后面用文件工具兜底建目录。

把探测结果记在心里，用于下一步给出"有依据的建议"，而不是让用户凭空选。

---

## 第 2 步 · 让用户选存储形态（只问一个问题）

用一句话问，给出基于第 1 步探测的建议：

> "你的笔记想用 **Obsidian** 管理，还是用**普通文件夹**管理？
> （检测到你已装 Obsidian / 你还没装 Obsidian，我建议 ……）"

按用户选择走下面三条路线之一：

### 路线 A · 已有 Obsidian，对接已有 Vault
- 把第 1 步探测到的候选 Vault 列给用户选（最多 3 个），也允许用户直接报路径。
- 用户确认后，记下 `vault_path` 与 `vault_name`。
- **不改动该 Vault 的任何现有内容**，只准备写入配置。

### 路线 B · 想用 Obsidian，但没装
- 告诉用户将从官网 https://obsidian.md/download 下载，**征得同意后**按其操作系统给安装包（Windows 用 `.exe` 或 winget；macOS 用 `.dmg`；Linux 用 AppImage）。
- 装好后问知识库放哪（给建议位置，如 `文档/SecondBrain`，必须是用户确认的绝对路径）。
- 创建新 Vault：PARA 五个目录 + `.obsidian/` 标记（见第 3 步）。
- 提醒用户：第一次打开 Obsidian 时选"打开本地仓库 / Open folder as vault"，选中这个目录。

### 路线 C · 不用 Obsidian，用普通文件夹（最省事）
- 问知识库放哪，确认绝对路径。
- 创建最小 PARA 目录（见第 3 步），不加 `.obsidian`。

---

## 第 3 步 · 创建 PARA 目录结构

在用户确认的路径下，创建五个目录：

```
📥 收件箱      （Inbox：所有灵感、外部保存的默认落点）
📂 项目        （Projects：有明确目标和截止的事）
📂 领域        （Areas：长期要维护的责任/方向）
📂 资源        （Resources：兴趣、参考资料）
📦 存档        （Archives：完结/不再活跃的一切）
```

- **优先用脚本**（有 Node 时）：
  - Obsidian 模式：`node skills/second-brain-hub/scripts/init-workspace.mjs --path <确认路径> --obsidian`
  - Markdown 模式：`node skills/second-brain-hub/scripts/init-workspace.mjs --path <确认路径>`
  - 脚本自带护栏（拒绝根目录/家目录），并输出 JSON 结果。
- **Node 不可用时**：用当前文件工具按同样结构创建；Obsidian 模式额外创建 `.obsidian/` 子目录。
- 目录已存在时跳过，不删除、不清空。

---

## 第 4 步 · 写入 hub-state.json

从模板生成用户专属配置（**不覆盖已有文件**，已存在则先备份）：

1. 复制 `hub-state.example.json` → `hub-state.json`。
2. 按所选路线填 `preferences`：

**Obsidian 模式**：
```json
{
  "preferences": {
    "storage_mode": "obsidian",
    "workspace_path": "<Vault 绝对路径>",
    "workspace_name": "<Vault 名称>",
    "vault_path": "<Vault 绝对路径>",
    "vault_name": "<Vault 名称>"
  }
}
```

**Markdown 模式**：
```json
{
  "preferences": {
    "storage_mode": "markdown",
    "workspace_path": "<工作区绝对路径>",
    "workspace_name": "<工作区名称>"
  }
}
```

3. 其余字段（`active_projects`、`twelve_problems`、`inbox_count` 等）保持模板默认，后续使用中由系统维护。
4. **重申**：`hub-state.json` 不进 Git、不外发。

---

## 第 5 步 · 最小可用验证

确认真的"能用了"再交付：

1. 知识库路径存在，且能在其中创建一条 Markdown 笔记。
2. 触发一次灵感速记：写入测试笔记 `记一下：这是我的第一条第二大脑笔记` 到 **📥 收件箱**。
3. 让用户能在 Obsidian 或文件管理器里**亲眼看到这条笔记**。

任何一步失败：报告卡在哪一步、原因是什么、建议怎么解决；必要时回滚新建的配置。

---

## 第 6 步 · 交付与下一步引导

用大白话告诉用户：

- ✅ 知识库搭好了，位置在 `<路径>`，用的是 Obsidian 还是普通文件夹；
- ✅ 第一条笔记已经躺在收件箱里了；
- 📣 以后可以这样对我说话：
  - "记一下……" —— 记灵感
  - "保存这篇文章 <链接>" —— 存网页
  - "帮我提炼这篇笔记" —— 提炼
  - "基于我收藏的资料，帮我列个大纲" —— 开始创作
  - "帮我做这周回顾" —— 周回顾
- 🔒 提醒：所有笔记都在你自己电脑里，是普通文本文件，永远是你的。

---

## 常见失败速查（排障）

| 现象 | 原因 | 处理 |
|---|---|---|
| 找不到 skills 目录 | 本 SOP 被带离原位置 | 确认 `hub-state.example.json` 与本文件同目录 |
| 用户不知道选哪条路线 | 没装 Obsidian 又怕麻烦 | 推荐路线 C（普通文件夹），后续可迁移 |
| `init-workspace.mjs` 报错拒绝路径 | 路径是根目录/家目录 | 让用户换一个具体的子文件夹 |
| Node 不可用 | 环境缺 Node | 改用文件工具手动建目录，结构相同 |
| 已有 Vault 但读不出来 | 路径含特殊字符/权限 | 请用户确认路径、或换普通文件夹模式 |
| 写完收件箱找不到笔记 | 路径未生效/Obsidian 未打开该库 | 引导用户在 Obsidian 打开该 Vault 或直接看文件夹 |

---

> 初始化完成后，本文件不再参与常规路由；后续日常使用走 SKILL.md 的八条场景路由。
