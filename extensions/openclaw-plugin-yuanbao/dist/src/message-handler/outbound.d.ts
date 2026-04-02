import type { OpenClawConfig, PluginRuntime } from 'openclaw/plugin-sdk';
import type { ResolvedYuanbaoAccount, YuanbaoMsgBodyElement } from '../types.js';
import type { YuanbaoWsClient } from '../yuanbao-server/ws/index.js';
import type { OutboundContentItem } from './handlers/index.js';
import type { MessageHandlerContext } from './context.js';
export declare function sendYuanbaoMessageBody(params: {
    account: ResolvedYuanbaoAccount;
    toAccount: string;
    msgBody: YuanbaoMsgBodyElement[];
    fromAccount?: string;
    ctx?: MessageHandlerContext;
}): Promise<{
    ok: boolean;
    messageId?: string;
    error?: string;
}>;
export declare function sendYuanbaoMessage(params: {
    account: ResolvedYuanbaoAccount;
    toAccount: string;
    text: string;
    fromAccount?: string;
    ctx?: MessageHandlerContext;
}): Promise<{
    ok: boolean;
    messageId?: string;
    error?: string;
}>;
export declare function sendYuanbaoGroupMessageBody(params: {
    account: ResolvedYuanbaoAccount;
    groupId: string;
    msgBody: YuanbaoMsgBodyElement[];
    fromAccount?: string;
    refMsgId?: string;
    ctx?: MessageHandlerContext;
}): Promise<{
    ok: boolean;
    messageId?: string;
    msgSeq?: number;
    error?: string;
}>;
export declare function sendYuanbaoGroupMessage(params: {
    account: ResolvedYuanbaoAccount;
    groupId: string;
    text: string;
    fromAccount?: string;
    refMsgId?: string;
    ctx?: MessageHandlerContext;
}): Promise<{
    ok: boolean;
    messageId?: string;
    msgSeq?: number;
    error?: string;
}>;
export declare function sendMsgBodyDirect(params: {
    account: ResolvedYuanbaoAccount;
    target: string;
    msgBody: YuanbaoMsgBodyElement[];
    wsClient: YuanbaoWsClient;
}): Promise<{
    ok: boolean;
    messageId?: string;
    error?: string;
}>;
export type ReplyTransport = {
    label: string;
    sendText: (params: {
        text: string;
    }) => Promise<{
        ok: boolean;
        error?: string;
    }>;
    sendItems?: (params: {
        items: OutboundContentItem[];
    }) => Promise<{
        ok: boolean;
        error?: string;
    }>;
};
export declare function executeReply(params: {
    transport: ReplyTransport;
    ctx: MessageHandlerContext;
    account: ResolvedYuanbaoAccount;
    core: PluginRuntime;
    config: OpenClawConfig;
    ctxPayload: Record<string, unknown>;
    replyRuntime: {
        config: OpenClawConfig;
        disableBlockStreaming: boolean;
    };
    tableMode: string;
    splitFinalText: (text: string) => string[];
    overflowPolicy: ResolvedYuanbaoAccount['overflowPolicy'];
    mediaLocalRoots?: string[];
}): Promise<void>;
//# sourceMappingURL=outbound.d.ts.map