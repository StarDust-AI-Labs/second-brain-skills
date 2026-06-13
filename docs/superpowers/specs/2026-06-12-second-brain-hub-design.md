# 第二大脑 Hub 系统设计方案

- **日期**: 2026-06-12
- **版本**: v1.0
- **状态**: 待评审

---

## 一、项目背景

### 1.1 目标

基于《打造第二大脑》提炼的 9 个方法论 skill + 5 个 Obsidian 工具 skill，构建一个统一的知识管理中枢（`second-brain-hub`），通过 Coze 3.0 App 作为入口，实现：

- **语音灵感** → 自动分类 → 写入 Obsidian
- **网页/文章** → 抓取提炼 → 按项目组织
- **创作启动** → 素材检索 → 大纲生成
- **定期回顾** → 收件箱清理 → 项目状态追踪

### 1.2 现有资产

| 层级 | Skill | 数量 |
|------|-------|------|
| 方法论层 | second-brain-code, capture-criteria, twelve-favorite-problems, para-system, progressive-summarization, creative-workflow, diverge-converge, intermediate-packets, knowledge-lifecycle | 9 |
| 工具层 | obsidian-markdown, obsidian-cli, obsidian-bases, json-canvas, defuddle | 5 |
| 存储层 | `D:\second-brain\第二大脑\` (Obsidian Vault) | 1 |

### 1.3 核心问题

现有 skill 各自独立响应触发词，缺乏统一编排层。方法论 skill 和 Obsidian 工具 skill 之间没有桥接——CODE skill 教"该做什么"，但不会自动调用 Obsidian skill "帮你做"。

---

## 二、架构设计

### 2.1 总体架构

```
Coze 3.0 App (语音·网页·文件·聊天)
         │
         ▼
┌─────────────────────────────────────┐
│        second-brain-hub (新建)       │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ 意图识别  │  │ 上下文记忆 │        │
│  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐        │
│  │ 方法论路由 │  │ Obsidian │        │
│  │ 调度器    │  │ 写入管道  │        │
│  └──────────┘  └──────────┘        │
└───┬─────────────────┬───────────────┘
    │ 调用              │ 调用
    ▼                  ▼
┌──────────────┐  ┌──────────────────┐
│ 9个方法论skill │  │ 5个Obsidian skill │
│ (不改动)      │  │ (obsidian-cli,   │
│               │  │  markdown, bases, │
│               │  │  canvas, defuddle)│
└──────────────┘  └────────┬─────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Obsidian Vault  │
                  │ D:\second-brain\│
                  │ 第二大脑/        │
                  └─────────────────┘
```

### 2.2 核心设计原则

1. **Hub 不重复造轮子** — 方法论判断全权交给子 skill，Hub 只管调度
2. **方法论 skill 零改动** — 现有 9 个 skill 保持不变，Hub 是它们的调用者
3. **统一写入管道** — 所有 Obsidian 写入走同一套模板和规范
4. **渐进式实施** — MVP 只做语音灵感 + 保存文章两个场景，后续迭代扩展

---

## 三、Hub 核心规格

### 3.1 意图识别 → 路由表

| 类别 | 意图信号 | 调度链 |
|------|---------|--------|
| 灵感速记 | "记""灵感""想到""idea" | Hub 追问归属 → obsidian-cli create |
| 保存外源 | "保存""收藏""这篇文章"+URL | defuddle → capture-criteria → para-system → progressive-summarization → obsidian-cli |
| 提炼加工 | "画重点""提炼""总结""摘要" | progressive-summarization → obsidian-cli update |
| 创作启动 | "写""做""制作""创作""生成" | intermediate-packets → creative-workflow → obsidian-cli |
| 回顾整理 | "整理""回顾""本周""每月" | knowledge-lifecycle → para-system → obsidian-cli |
| 探索查询 | "找""搜索""有没有""在哪" | obsidian-cli search → twelve-favorite-problems |
| 不确定 | 无法归类 | Hub 简短追问澄清 → 归入最匹配流程 |

### 3.2 上下文记忆

Hub 维护 `D:\second-brain\第二大脑\.obsidian\hub-state.json`：

```json
{
  "active_projects": ["第二大脑体系搭建", "AI视频创作", "阅读分享"],
  "last_operations": [
    {"action": "create", "path": "项目/...", "time": "2026-06-12T10:30"},
    ...
  ],
  "preferences": {
    "default_distill_level": 1,
    "weekly_review_day": "friday",
    "inbox_warning_threshold": 15
  }
}
```

### 3.3 统一笔记模板

```markdown
---
source: {{来源URL | 语音 | 原创}}
captured: {{YYYY-MM-DD HH:mm}}
project: {{归属项目 | 领域 | 资源}}
status: inbox | processed | distilled | archived
tags: [{{tag1}}, {{tag2}}]
related: [[{{关联笔记}}]]
related_problems: [{{问题编号}}]
---

# {{标题}}

{{正文内容}}

> [!abstract] 核心要点
> {{一句话摘要}}
```

### 3.4 Hub 执行流程

```
hub(input):
  1. 意图 = intent_classify(input)
  2. context = load_hub_state()
  3. 路由到对应场景流程
  4. 调用方法论 skill 获取认知结果
  5. 调用 Obsidian skill 写入/读取
  6. save_hub_state()
  7. 返回金字塔式反馈给用户
```

---

## 四、Skill 调用链关系

### 4.1 显式依赖关系（从 SKILL.md 源码提取）

```
second-brain-code (总框架)
  composes-with: ALL other skills
  │
  ├── capture-criteria (抓取标准)
  │     composes-with: twelve-favorite-problems, progressive-summarization
  │
  ├── twelve-favorite-problems (12个兴趣问题)
  │     composes-with: capture-criteria, diverge-converge
  │
  ├── para-system (组织分类)
  │     composes-with: intermediate-packets, knowledge-lifecycle
  │
  ├── progressive-summarization (渐进提炼)
  │     composes-with: capture-criteria, intermediate-packets
  │
  ├── diverge-converge (发散聚合)
  │     composes-with: creative-workflow, capture-criteria
  │
  ├── creative-workflow (创作流程)
  │     depends-on: diverge-converge, intermediate-packets
  │     composes-with: knowledge-lifecycle
  │
  ├── intermediate-packets (半熟素材)
  │     depends-on: para-system, progressive-summarization
  │     composes-with: creative-workflow, knowledge-lifecycle
  │
  └── knowledge-lifecycle (生命周期)
        depends-on: para-system
        composes-with: intermediate-packets, creative-workflow
```

### 4.2 按 CODE 四阶段的调用链

```
阶段1 抓取:  twelve-favorite-problems → capture-criteria
阶段2 组织:  para-system
阶段3 提炼:  progressive-summarization
阶段4 表达:  diverge-converge → creative-workflow → intermediate-packets
维护层:     knowledge-lifecycle (持续运行)
```

### 4.3 Hub 的三条场景调度链

```
【快速记】capture → twelve-favorite → para → progressive(按需) → obsidian
【深度创作】diverge-converge → creative-workflow → intermediate-packets → progressive → obsidian
【定期回顾】knowledge-lifecycle → para → intermediate-packets → obsidian
```

---

## 五、Obsidian Vault PARA 重组

### 5.1 当前状态

```
D:\second-brain\第二大脑\
├── 欢迎.md
├── 打造第二大脑-方法论笔记.md
├── AI创作方向.md / AI创作思路.md / AI宏大叙事.md
├── AI技术实战/ (混合：项目+思考)
├── AI视频创作思路/ (混合：项目+灵感)
├── 视频文稿/ (项目产物)
└── 阅读分享计划/ (空文件夹，搁置)
```

**问题**：按主题分类、项目领域混合、无收件箱、无存档。

### 5.2 目标结构

```
D:\second-brain\第二大脑\
├── 📥 收件箱/
├── 📂 项目/
│   ├── 第二大脑体系搭建/
│   ├── AI视频创作/
│   └── 阅读分享/
├── 📂 领域/
│   ├── AI技术/
│   ├── 内容创作/
│   ├── 知识管理/
│   └── 职业发展/
├── 📂 资源/
│   ├── AI前沿/
│   ├── 视频创作方法论/
│   └── 写作素材/
└── 📂 存档/
    └── 2024-2025/
```

### 5.3 迁移策略（三步渐进）

1. **第一步**：创建 PARA 四文件夹骨架，现有文件整体快照移入 `存档/2024-2025/`
2. **第二步**：只激活 3 个当前项目 — 从存档拖回 `项目/`
3. **第三步**：日常使用中自然回流 — 每次用到旧笔记顺手移到正确位置

---

## 六、六大场景流程

### 场景 1：语音灵感速记
```
Coze语音 → Hub意图识别 → 追问项目归属 → obsidian-cli create → 反馈
轮次: ~3  |  耗时: ~15秒
```

### 场景 2：保存公众号文章
```
链接 → defuddle提取 → capture-criteria判断 → para-system分类
     → progressive-summarization L1 → obsidian写入 → 反馈
轮次: ~5  |  耗时: ~40秒
```

### 场景 3：收件箱批量处理
```
Hub → obsidian-cli list收件箱 → 逐条引导(保留/删除/归属) → 摘要报告
输出: 收件箱清零 + 归类统计
```

### 场景 4：启动创作
```
Hub → intermediate-packets搜索素材 → creative-workflow思想群岛
     → obsidian-cli创建项目文件夹+大纲 → 海明威之桥
输出: 项目从零到可写第一节
```

### 场景 5：每周回顾
```
Hub(或定时触发) → knowledge-lifecycle → obsidian-cli检查收件箱/本周笔记/项目状态
     → 生成周回顾笔记 + 金字塔反馈
输出: 周回顾笔记 + 异常提醒
```

### 场景 6：12个问题过滤
```
Hub → twelve-favorite-problems加载清单 → 逐问题匹配 → 标注 → 写回笔记
输出: 标注了相关问题编号的笔记
```

---

## 七、实现计划

### 7.1 MVP (P0)

| 项目 | 说明 |
|------|------|
| `second-brain-hub` SKILL.md | 意图识别 + 路由 + 上下文记忆 + Obsidian写入管道 |
| Vault PARA 重组 | 创建四文件夹 + 现有文件快照迁移 |
| 统一笔记模板 | frontmatter 规范 + 正文结构模板 |
| 场景 1 实现 | 语音灵感速记 |
| 场景 2 实现 | 保存文章 |

**MVP 验证标准**：Coze 语音/链接输入 → Obsidian 正确位置出现笔记

### 7.2 v1.1 (P1)

| 项目 | 说明 |
|------|------|
| 场景 3 | 收件箱批量处理 |
| 场景 4 | 启动创作（思想群岛 + 海明威之桥） |
| progressive-summarization 深度集成 | Hub 自动判断提炼深度 |

### 7.3 v1.2 (P2)

| 项目 | 说明 |
|------|------|
| 场景 5 | 每周回顾（手动触发） |
| 场景 6 | 12 个问题过滤 |
| obsidian-bases 仪表盘 | 项目看板 + 收件箱监控视图 |

### 7.4 v2.0 (P3)

| 项目 | 说明 |
|------|------|
| Cron 定时回顾 | 每周五自动触发周回顾 |
| 收件箱预警 | 超过阈值主动提醒 |
| 项目停滞检测 | 7 天无活动自动标注 |

---

## 八、成功标准

1. **MVP 收件箱测试**：用户说一句话 → 15 秒内笔记出现在 Obsidian 正确文件夹
2. **收件箱清零**：每周回顾后收件箱为 0
3. **零方法论 skill 改动**：9 个现有 skill 的 SKILL.md 一字不改
4. **项目可追踪**：通过 obsidian-bases 仪表盘可看到每个项目的笔记数和最后活跃时间

---

## 九、不做什么

- ❌ 不改动现有 9 个方法论 skill
- ❌ 不新增 Obsidian 插件（只用已有的 obsidian-cli）
- ❌ 不引入外部数据库或服务
- ❌ 不在 MVP 阶段实现 12 个兴趣问题清单（用户需自行梳理）
- ❌ 不在 MVP 阶段实现定时自动化（v2.0 再做）

---

## 十、风险与缓解

| 风险 | 缓解 |
|------|------|
| obsidian-cli 某些操作不支持 | 降级为 obsidian-markdown 手动创建 .md 文件 |
| Coze 多轮对话状态丢失 | Hub 的 hub-state.json 持久化上下文 |
| 意图识别误判 | 不确定时追问澄清，不强行归类 |
| Vault 重组打断现有工作流 | 三步渐进迁移，不破坏任何现有内容 |

---

## 附录 A：现有 Skill 清单

| Skill | 来源 | 功能 |
|-------|------|------|
| second-brain-code | 《打造第二大脑》 | CODE 四步法总框架 |
| capture-criteria | 《打造第二大脑》 | 四标准 + 共鸣原则 |
| twelve-favorite-problems | 《打造第二大脑》 | 12 个兴趣问题导航 |
| para-system | 《打造第二大脑》 | 项目/领域/资源/存档分类 |
| progressive-summarization | 《打造第二大脑》 | 四层渐进式提炼 |
| creative-workflow | 《打造第二大脑》 | 思想群岛 + 海明威之桥 + 压缩范围 |
| diverge-converge | 《打造第二大脑》 | 发散聚合模式切换 |
| intermediate-packets | 《打造第二大脑》 | 半熟素材资产化 |
| knowledge-lifecycle | 《打造第二大脑》 | 项目清单 + 周月回顾 + 处处留意 |
| obsidian-markdown | obsidian-skills-main | Obsidian 风格 Markdown |
| obsidian-cli | obsidian-skills-main | Obsidian 命令行操作 |
| obsidian-bases | obsidian-skills-main | Obsidian Bases 数据库视图 |
| json-canvas | obsidian-skills-main | JSON Canvas 画布 |
| defuddle | obsidian-skills-main | 网页→Markdown 提取 |

## 附录 B：Vault 文件迁移映射

| 现有位置 | 目标位置 | 理由 |
|----------|---------|------|
| 欢迎.md | 保留不动 | vault 入口 |
| 打造第二大脑-方法论笔记.md | 领域/知识管理/ | 长期参考资料 |
| AI创作方向.md | 领域/内容创作/ | 持续性思考 |
| AI创作思路.md | 领域/内容创作/ | 持续性思考 |
| AI宏大叙事.md | 资源/写作素材/ | 创意灵感储备 |
| AI技术实战/AI大脑项目.md | 项目/第二大脑体系搭建/ | 有明确交付物 |
| AI技术实战/ai未来预测.md | 资源/AI前沿/ | 兴趣探索 |
| AI视频创作思路/AI创作灵感.md | 领域/内容创作/ | 持续积累 |
| AI视频创作思路/古诗词意象影视化.md | 项目/AI视频创作/ | 有明确产出方向 |
| AI视频创作思路/阅读计划.md | 项目/阅读分享/ | 可执行 |
| 视频文稿/制作第二大脑.md | 项目/第二大脑体系搭建/ | 当前核心项目 |
| 阅读分享计划/ | 项目/阅读分享/ | 可执行 |
