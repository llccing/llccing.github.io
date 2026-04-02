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
import type { QQBotAccountConfig } from "./types.js";
/** 斜杠指令上下文（消息元数据 + 运行时状态） */
export interface SlashCommandContext {
    /** 消息类型 */
    type: "c2c" | "guild" | "dm" | "group";
    /** 发送者 ID */
    senderId: string;
    /** 发送者昵称 */
    senderName?: string;
    /** 消息 ID（用于被动回复） */
    messageId: string;
    /** 开平推送的事件时间戳（ISO 字符串） */
    eventTimestamp: string;
    /** 插件收到消息的本地时间（ms） */
    receivedAt: number;
    /** 原始消息内容 */
    rawContent: string;
    /** 指令参数（去掉指令名后的部分） */
    args: string;
    /** 频道 ID（guild 类型） */
    channelId?: string;
    /** 群 openid（group 类型） */
    groupOpenid?: string;
    /** 账号 ID */
    accountId: string;
    /** 账号配置（供指令读取可配置项） */
    accountConfig?: QQBotAccountConfig;
    /** 当前用户队列状态快照 */
    queueSnapshot: QueueSnapshot;
}
/** 队列状态快照 */
export interface QueueSnapshot {
    /** 各用户队列中的消息总数 */
    totalPending: number;
    /** 正在并行处理的用户数 */
    activeUsers: number;
    /** 最大并发用户数 */
    maxConcurrentUsers: number;
    /** 当前发送者在队列中的待处理消息数 */
    senderPending: number;
}
/** 斜杠指令返回值：文本、带文件的结果、或 null（不处理） */
export type SlashCommandResult = string | SlashCommandFileResult | null;
/** 带文件的指令结果（先回复文本，再发送文件） */
export interface SlashCommandFileResult {
    text: string;
    /** 要发送的本地文件路径 */
    filePath: string;
}
/**
 * 尝试匹配并执行插件级斜杠指令
 *
 * @returns 回复文本（匹配成功），null（不匹配，应入队正常处理）
 */
export declare function matchSlashCommand(ctx: SlashCommandContext): Promise<SlashCommandResult>;
/** 获取插件版本号（供外部使用） */
export declare function getPluginVersion(): string;
