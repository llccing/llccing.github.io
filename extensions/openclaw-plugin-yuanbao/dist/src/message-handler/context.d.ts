import type { OpenClawConfig, PluginRuntime } from 'openclaw/plugin-sdk';
import type { ResolvedYuanbaoAccount } from '../types.js';
import type { YuanbaoWsClient } from '../yuanbao-server/ws/index.js';
export type MessageHandlerContext = {
    account: ResolvedYuanbaoAccount;
    config: OpenClawConfig;
    core: PluginRuntime;
    log: {
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error: (msg: string) => void;
        verbose: (msg: string) => void;
    };
    statusSink?: (patch: {
        lastInboundAt?: number;
        lastOutboundAt?: number;
    }) => void;
    wsClient: YuanbaoWsClient;
    abortSignal?: AbortSignal;
};
export declare const YUANBAO_FINAL_TEXT_CHUNK_LIMIT = 3500;
export declare const YUANBAO_OVERFLOW_NOTICE_TEXT = "\u5185\u5BB9\u8F83\u957F\uFF0C\u5DF2\u505C\u6B62\u53D1\u9001\u5269\u4F59\u5185\u5BB9\u3002";
export declare const REPLY_TIMEOUT_MS: number;
export declare function ctxLog(ctx: MessageHandlerContext, level: 'info' | 'warn' | 'error', message: string): void;
export declare function ctxVerbose(ctx: MessageHandlerContext, message: string): void;
export declare function resolveOutboundSenderAccount(account: ResolvedYuanbaoAccount): string | undefined;
export declare function splitTextByFixedLength(text: string, limit: number): string[];
export declare function splitTextByUtf8ByteLength(text: string, byteLimit: number): string[];
export declare function rewriteSlashCommand(text: string, onRewrite?: (original: string, rewritten: string) => void): string;
//# sourceMappingURL=context.d.ts.map