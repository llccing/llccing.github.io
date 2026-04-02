import { type ChannelPlugin } from "openclaw/plugin-sdk";
import type { ResolvedQQBotAccount } from "./types.js";
/** QQ Bot 单条消息文本长度上限 */
export declare const TEXT_CHUNK_LIMIT = 5000;
/**
 * Markdown 感知的文本分块函数
 * 委托给 SDK 内置的 channel.text.chunkMarkdownText
 * 支持代码块自动关闭/重开、括号感知等
 */
export declare function chunkText(text: string, limit: number): string[];
export declare const qqbotPlugin: ChannelPlugin<ResolvedQQBotAccount>;
