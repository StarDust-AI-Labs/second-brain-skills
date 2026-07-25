# Agent 记忆文档

## 仓库远程配置

本仓库 (`D:\aiCoding\projects\second-brain`) 配置了两个远程仓库：

| 远程名 | URL | 用途 |
|--------|-----|------|
| `origin` | `git@github.com:StarDust-AI-Labs/second-brain-skills.git` | GitHub 主仓库 |
| `gitee` | `git@gitee.com:hyniubi/tingyus-cloud-brain.git` | Gitee 镜像仓库 |

## 自动同步任务

- **任务名**: 第二大脑 · 每小时同步远程仓库
- **频率**: 每 1 小时
- **时区**: Asia/Shanghai
- **行为**:
  1. 自动提交本地未提交的改动
  2. 先从 `origin` 拉取变更，再从 `gitee` 拉取变更
  3. 若发生冲突，自动使用 `merge -X ours` 保留本地版本
  4. 将本地提交推送到 `origin` 和 `gitee`
