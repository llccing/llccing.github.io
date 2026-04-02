/**
 * QQBot 插件级斜杠指令处理器
 *
 * 设计原则：
 * 1. 在消息入队前拦截，匹配到插件级指令后直接回复，不进入 AI 处理队列
 * 2. 不匹配的 "/" 消息照常入队，交给 OpenClaw 框架处理
 * 3. 每个指令通过 SlashCommand 接口注册，易于扩展
 *
 * 时间线追踪：
 *   开平推送时间戳 → 插件收到(Date.now()) → 指令处理完成(Date.now())
 *   从而计算「开平→插件」和「插件处理」两段耗时
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { getUpdateInfo } from "./update-checker.js";
const require = createRequire(import.meta.url);
// 读取 package.json 中的版本号
let PLUGIN_VERSION = "unknown";
try {
    const pkg = require("../package.json");
    PLUGIN_VERSION = pkg.version ?? "unknown";
}
catch {
    // fallback
}
// 获取 openclaw 框架版本（缓存结果，只执行一次）
let _frameworkVersion = null;
function getFrameworkVersion() {
    if (_frameworkVersion !== null)
        return _frameworkVersion;
    try {
        for (const cli of ["openclaw", "clawdbot", "moltbot"]) {
            try {
                const out = execFileSync(cli, ["--version"], { timeout: 3000, encoding: "utf8" }).trim();
                // 输出格式: "OpenClaw 2026.3.13 (61d171a)"
                if (out) {
                    _frameworkVersion = out;
                    return _frameworkVersion;
                }
            }
            catch {
                continue;
            }
        }
    }
    catch {
        // fallback
    }
    _frameworkVersion = "unknown";
    return _frameworkVersion;
}
// ============ 指令注册表 ============
const commands = new Map();
function registerCommand(cmd) {
    commands.set(cmd.name.toLowerCase(), cmd);
}
// ============ 内置指令 ============
/**
 * /bot-ping — 测试当前 openclaw 与 QQ 连接的网络延迟
 */
registerCommand({
    name: "bot-ping",
    description: "测试当前 openclaw 与 QQ 连接的网络延迟",
    handler: (ctx) => {
        const now = Date.now();
        const eventTime = new Date(ctx.eventTimestamp).getTime();
        if (isNaN(eventTime)) {
            return `✅ pong!`;
        }
        const totalMs = now - eventTime;
        const qqToPlugin = ctx.receivedAt - eventTime;
        const pluginProcess = now - ctx.receivedAt;
        const lines = [
            `✅ pong！`,
            ``,
            `⏱ 延迟: ${totalMs}ms`,
            `  ├ 网络传输: ${qqToPlugin}ms`,
            `  └ 插件处理: ${pluginProcess}ms`,
        ];
        return lines.join("\n");
    },
});
/**
 * /bot-version — 查看插件版本号
 */
registerCommand({
    name: "bot-version",
    description: "查看插件版本号",
    handler: () => {
        const frameworkVersion = getFrameworkVersion();
        const lines = [
            `🦞框架版本：${frameworkVersion}`,
            `🤖QQBot 插件版本：v${PLUGIN_VERSION}`,
        ];
        const info = getUpdateInfo();
        if (info.checkedAt === 0) {
            lines.push(`⏳ 版本检查中...`);
        }
        else if (info.error) {
            lines.push(`⚠️ 版本检查失败`);
        }
        else if (info.hasUpdate && info.latest) {
            lines.push(`🆕最新可用版本：v${info.latest}，点击 <qqbot-cmd-input text="/bot-upgrade" show="/bot-upgrade"/> 查看升级指引`);
        }
        lines.push(`🌟官方 GitHub 仓库：[点击前往](https://github.com/tencent-connect/openclaw-qqbot/)`);
        return lines.join("\n");
    },
});
/**
 * /bot-help — 查看所有指令以及用途
 */
registerCommand({
    name: "bot-help",
    description: "查看所有指令以及用途",
    handler: () => {
        const lines = [`### QQBot插件内置调试指令`, ``];
        for (const [name, cmd] of commands) {
            lines.push(`<qqbot-cmd-input text="/${name}" show="/${name}"/> ${cmd.description}`);
        }
        lines.push(``, `> 插件版本 v${PLUGIN_VERSION}`);
        return lines.join("\n");
    },
});
const DEFAULT_UPGRADE_URL = "https://doc.weixin.qq.com/doc/w3_AKEAGQaeACgCNHrh1CbHzTAKtT2gB?scode=AJEAIQdfAAozxFEnLZAKEAGQaeACg";
/**
 * /bot-upgrade — 查看版本更新状态 + 升级指引
 */
registerCommand({
    name: "bot-upgrade",
    description: "查看版本更新与升级指引",
    handler: (ctx) => {
        const url = ctx.accountConfig?.upgradeUrl || DEFAULT_UPGRADE_URL;
        const info = getUpdateInfo();
        const lines = [];
        lines.push(`📌当前版本：v${PLUGIN_VERSION}`);
        if (info.checkedAt === 0) {
            lines.push(`⏳ 版本检查中，请稍后再试`);
        }
        else if (info.error) {
            lines.push(`⚠️ 版本检查失败`);
        }
        else if (info.hasUpdate && info.latest) {
            lines.push(`🆕最新可用版本：v${info.latest}`);
        }
        else {
            lines.push(`✅ 当前已是最新版本`);
        }
        lines.push(`⬆️升级指引：[点击查看](${url})`);
        lines.push(`🌟官方 GitHub 仓库：[点击前往](https://github.com/tencent-connect/openclaw-qqbot/)`);
        return lines.join("\n");
    },
});
/**
 * /bot-logs — 导出本地日志文件
 */
registerCommand({
    name: "bot-logs",
    description: "导出本地日志文件",
    handler: () => {
        const homeDir = process.env.HOME || "~";
        const logDir = path.join(homeDir, ".openclaw", "logs");
        const gatewayLog = path.join(logDir, "gateway.log");
        const errLog = path.join(logDir, "gateway.err.log");
        const lines = [];
        // 读取 gateway.log 最后 2000 行
        for (const logFile of [gatewayLog, errLog]) {
            if (!fs.existsSync(logFile))
                continue;
            try {
                const content = fs.readFileSync(logFile, "utf8");
                const allLines = content.split("\n");
                const tail = allLines.slice(-1000); // 每个文件取最后 1000 行
                if (tail.length > 0) {
                    lines.push(`\n========== ${path.basename(logFile)} (last ${tail.length} lines) ==========\n`);
                    lines.push(...tail);
                }
            }
            catch {
                lines.push(`[读取 ${path.basename(logFile)} 失败]`);
            }
        }
        if (lines.length === 0) {
            return "⚠️ 未找到日志文件";
        }
        // 写入临时文件
        const tmpDir = path.join(homeDir, ".openclaw", "qqbot", "downloads");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const tmpFile = path.join(tmpDir, `bot-logs-${timestamp}.txt`);
        fs.writeFileSync(tmpFile, lines.join("\n"), "utf8");
        const totalLines = lines.filter(l => !l.startsWith("=")).length;
        return {
            text: `📋 日志已打包（约 ${totalLines} 行），正在发送文件...`,
            filePath: tmpFile,
        };
    },
});
// ============ 匹配入口 ============
/**
 * 尝试匹配并执行插件级斜杠指令
 *
 * @returns 回复文本（匹配成功），null（不匹配，应入队正常处理）
 */
export async function matchSlashCommand(ctx) {
    const content = ctx.rawContent.trim();
    if (!content.startsWith("/"))
        return null;
    // 解析指令名和参数
    const spaceIdx = content.indexOf(" ");
    const cmdName = (spaceIdx === -1 ? content.slice(1) : content.slice(1, spaceIdx)).toLowerCase();
    const args = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1).trim();
    const cmd = commands.get(cmdName);
    if (!cmd)
        return null; // 不是插件级指令，交给框架
    ctx.args = args;
    const result = await cmd.handler(ctx);
    return result;
}
/** 获取插件版本号（供外部使用） */
export function getPluginVersion() {
    return PLUGIN_VERSION;
}
