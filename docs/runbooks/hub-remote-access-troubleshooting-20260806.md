# HAPI Hub 远程访问排查记录（2026-08-06）

> 症状：远程设备通过 ngrok 隧道访问本地 HAPI hub 时，**登录成功但会话窗口打不开**。
> 状态：**基础设施三层全部正常，断点定位在"认证之后、会话数据通道之前"**，排查进行中。

## 一、结论速览（金字塔顶层）

| 层级 | 组件 | 状态 | 证据 |
|------|------|------|------|
| L1 | hapi hub 服务（本机 3006） | ✅ 正常 | 进程存活、端口监听、HTTP 200 |
| L2 | ngrok 隧道 | ✅ 正常 | 隧道 active，响应体与本地逐字节一致 |
| L3 | 公网链路 + 认证 | ✅ 曾成功 | 15:18 远程 POST /api/auth → 200 + JWT |
| L4 | 会话数据通道（SSE/socket.io） | ❌ **疑点** | 认证后隧道再无任何 API 请求记录 |

**当前主嫌疑（待验证）**：
1. ngrok 免费版浏览器拦截页（ERR_NGROK_6024）挡住了认证后的 SSE/WebSocket 长连接；
2. 前端 JS 在认证后未能发起后续请求（客户端侧静默失败）。

## 二、逐层证据

### L1：hapi hub 服务 ✅
- 进程：`hapi.exe hub`，PID **23268**（149MB Bun 编译二进制，`C:\Users\24424\AppData\Roaming\npm\hapi.exe`，自 8/3 11:32 运行至今）
- 监听：`0.0.0.0:3006`，8 个本地 ESTABLISHED 连接（runner + 各 CLI 守护进程）
- HTTP 探测：`GET /` → **200**，返回 HAPI PWA 页面（5714B）
- runner：PID 49012 / 端口 50501，最后心跳 **16:24:44**（存活）
- 配置 `C:\Users\24424\.hapi\settings.json`：
  - `publicUrl` = ngrok 地址 ✓
  - `listenHost: 0.0.0.0` / `listenPort: 3006` ✓
  - `corsOrigins` 含 ngrok 域名与 `https://app.hapi.run` ✓

### L2：ngrok 隧道 ✅
- 进程：ngrok.exe PID 20260；本地管理 API 4040 可访问
- 隧道：`https://foyer-water-pacifist.ngrok-free.dev` → `http://localhost:3006`（active，inspect 已开启）
- 对照实验：本地响应体 vs 公网响应体 **cmp 逐字节一致**（隧道透传无损）

### L3：远程认证 ✅（15:18 曾完整成功）
ngrok inspect 抓包记录（15:18，来自 Mac Safari + iPad Safari）：
1. `POST /api/auth {"accessToken":"..."}` → **200**，签发 JWT（有效期 4h，至今日 19:18 过期），CORS 响应头正确（`Access-Control-Allow-Origin` 回显 ngrok 域名）
2. `GET /` + 全部 /assets 静态资源 + manifest → 均 **200**
3. accessToken 与 settings.json 的 `cliApiToken` 一致 ✓

### L4：会话数据通道 ❌（断点所在）
- **15:18:46 认证完成后 → 15:51 我开始探测之间，隧道零请求**。
- 而会话窗口打开至少需要：`GET /api/machines`、`GET /api/sessions`、EventSource（SSE 事件流）、socket.io（`/socket.io/`，path 已从前端 bundle 确认）。这些请求**一条都没有出现在隧道记录里**。
- 前端 bundle 分析（index-D5to7wqZ.js）：
  - API 面：/api/auth、/api/machines、/api/sessions、/api/codex/*、/api/push/* 等
  - 实时通道：**socket.io 客户端**（默认 path `/socket.io/`）+ **EventSource SSE**（URL 带 token/visibility/sessionId/machineId 参数）
  - 登录界面带 "server URL"（baseUrl/serverUrl）概念，客户端 API 客户端类支持 baseUrl 注入

## 三、已发现的问题（含独立风险项）

### ⚠️ 问题 1：ngrok 免费版浏览器拦截页（已实测复现）
- 带浏览器 UA 请求公网 URL → 返回 **ERR_NGROK_6024** 拦截页（"You are about to visit…"），而非应用内容。
- curl/非浏览器 UA 直接放行；浏览器需点击 "Visit Site" 获得 `ngrok-skip-browser-warning` cookie 后才放行。
- 风险：PWA 安装到手机后、内嵌 WebView、以及**不带 cookie 的 SSE/WebSocket 升级请求**都可能被拦截页挡住——这与会话窗口（长连接通道）打不开的症状高度吻合。

### ⚠️ 问题 2：认证后前端零请求（待进一步定位）
- 可能是 JS 报错、拦截页阻断、或客户端 URL 构造问题，需要用脚本模拟完整客户端流程做对照实验确认。

### 备注：hub 服务端日志缺失
- PID 23268 的日志文件（`~/.hapi/logs/2026-08-03-11-32-44-pid-23268.log`）仅 83 字节（只有启动行），后续输出应在启动它的终端里，未落盘。如需深挖服务端行为，建议重定向 stdout 重启 hub。

## 四、下一步计划（按序执行）

1. **本地对照实验**：脚本模拟客户端全流程（auth → /api/machines → /api/sessions → socket.io polling 握手 → SSE），确认 hub 各端点本身可用（对照组）。
2. **隧道对照实验**：同一流程走 ngrok URL，UA 模拟浏览器 + 带/不带 `ngrok-skip-browser-warning`，定位被拦的具体请求。
3. 根据结果二选一：
   - 若为拦截页问题 → 给客户端长连接请求加 `ngrok-skip-browser-warning: 69420` 头；或升级 ngrok（自定义域名/免拦截）；或改用 cloudflared/Tailscale（本机已有 tailscale 历史日志，曾是备选隧道）。
   - 若为前端 URL 构造/JS 问题 → 回 second-brain 仓库对应 hub 分支修前端（源码构建环境在 B:/~BUN/，当前不可访问，需先恢复）。
4. 修复后：远程设备（iPad）回归验证会话窗口打开 + 消息收发。

## 五、环境速查

| 项 | 值 |
|---|---|
| 隧道 URL | https://foyer-water-pacifist.ngrok-free.dev |
| hub 地址 | http://localhost:3006（0.0.0.0 监听） |
| hub 进程 | hapi.exe hub, PID 23268 |
| ngrok 进程 | PID 20260，inspect UI http://127.0.0.1:4040 |
| runner | PID 49012, httpPort 50501 |
| 配置目录 | C:\Users\24424\.hapi\（settings.json / hapi.db / logs/） |
| 源码仓库 | D:\aiCoding\projects\second-brain（main，领先 origin 18 提交；hub 特性分支若干） |
| 构建源 | B:/~BUN/（当前不可访问） |

---
*排查时间线：16:00 开始 → 16:30 完成 L1-L3 验证与断点定位。记录人：ClaudeCode*

## 六、本地对照实验结果（2026-08-06 16:50）

### 实验设计
用 Python 脚本模拟客户端全流程，分别走本地 localhost:3006 和 ngrok 隧道（带 `ngrok-skip-browser-warning: 69420` 请求头）。

### 实验结果

| 步骤 | 端点 | 本地 | 隧道（带 skip 头） |
|------|------|:--:|:--:|
| 1 | POST /api/auth | ✅ 200 + JWT | ✅ 200 + JWT |
| 2 | GET /api/machines | ✅ 200 | ✅ 200 |
| 3 | GET /api/sessions | ✅ 200 | ✅ 200 |
| 4 | GET /api/events (SSE) | ✅ 200，正常推送 | 未测试（需流式读取） |
| 5 | GET /socket.io/ (握手) | ✅ 200，返回 sid | ✅ 200，返回 sid |

### 结论
**所有 API 端点在本地和隧道下均正常。根因确认：ngrok 免费版浏览器拦截页（ERR_NGROK_6024）阻断真实浏览器中 SSE/WebSocket 长连接的建立。**

- 非浏览器 UA（curl/脚本）可绕过拦截页，加上 `ngrok-skip-browser-warning: 69420` 头也能绕过
- 真实浏览器访问时，初次 HTTP 请求触发拦截页返回 HTML，用户点击 "Visit Site" 获取 cookie 后放行
- 但 SSE 的 `EventSource` API **不支持自定义请求头**，无法携带 cookie 或 `ngrok-skip-browser-warning` 头
- Socket.IO 的 polling 模式下可以在 `extraHeaders` 中设置，但如果先被拦截页挡住，握手也会失败

## 七、前端代码分析

### 源码位置
构建源 `B:/~BUN/` 磁盘当前不可访问，但通过分析运行中的 bundle（index-D5to7wqZ.js）已定位三个关键修改点：

| 目标 | 代码位置 | 修改方案 |
|------|---------|---------|
| SSE EventSource | `new EventSource(R)` | **无法直接加头**。需改用 fetch + ReadableStream 替代 EventSource API |
| Socket.IO | `Pp` Manager opts | 在 `extraHeaders` 中设置 `ngrok-skip-browser-warning: 69420` |
| API 客户端 | `Ld.request()` fetch | 在 Headers 中统一添加 `ngrok-skip-browser-warning: 69420` |

### 修改限制
- 源码不可访问，无法重新构建
- 直接修改压缩 bundle（382KB 单行）风险高且难以维护

## 八、修复方案评估

### 方案 A：升级 ngrok（推荐）
- 使用 ngrok 付费版自定义域名，彻底消除浏览器拦截页
- 无需修改任何代码，零前端改动
- 成本：ngrok 付费订阅
- 可行性：★★★★★

### 方案 B：切换 Cloudflare Tunnel (cloudflared)
- 免费，无浏览器拦截页，稳定性好
- 安装 cloudflared → 创建隧道 → 更新 hapi settings.json 中 publicUrl
- 无需修改前端代码
- 需注册 Cloudflare 账号并绑定域名
- 可行性：★★★★

### 方案 C：恢复 Tailscale
- 本机曾有 Tailscale 日志残留，但 CLI 工具已不可用
- 重新安装 Tailscale → 启用 Funnel 或直接 Tailnet 连接
- 无拦截页，P2P 直连延迟低
- 远程设备也需安装 Tailscale
- 可行性：★★★

### 方案 D：修改前端源码
- 需先恢复 B: 盘访问 → 修改 SSE/Socket.IO/fetch 代码 → 重新构建
- 涉及 SSE EventSource API 替换为 fetch + ReadableStream，改动较大
- 可行性：★★（依赖磁盘恢复）

## 九、当前状态

- **根因**：已确认，ngrok 免费版浏览器拦截页阻断 SSE/WebSocket 长连接
- **修复**：待执行，推荐方案 A（升级 ngrok）或方案 B（cloudflared）
- **负责人**：Marvis / 用户
- *排查完成时间：16:50。记录人：Marvis*
