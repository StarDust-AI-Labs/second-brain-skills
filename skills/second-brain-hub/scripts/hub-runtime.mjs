#!/usr/bin/env node
// 第二大脑 Hub Runtime 唯一公开入口。
// 命令：start / route / step / preflight / commit / gate / finish / status。
// 状态机、门禁与卡片协议见 references/runtime-protocol.md。
// 退出码：0 成功；1 门禁拒绝/验证失败；2 用法错误或阻塞。
import { main } from "./hub-runtime/cli.mjs";

process.exitCode = main(process.argv.slice(2));
