import type { YuanbaoInboundMessage, YuanbaoMsgBodyElement } from '../../types.js';
import type { WsSendC2CMessageData, WsSendGroupMessageData, WsSendMessageResponse } from './types.js';
export declare const BIZ_MSG_TYPES: {
    readonly MsgContent: "trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.MsgContent";
    readonly MsgBodyElement: "trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.MsgBodyElement";
    readonly InboundMessagePush: "trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.InboundMessagePush";
    readonly SendC2CMessageReq: "trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.SendC2CMessageReq";
    readonly SendGroupMessageReq: "trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.SendGroupMessageReq";
    readonly SendC2CMessageRsp: "trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.SendC2CMessageRsp";
    readonly SendGroupMessageRsp: "trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy.SendGroupMessageRsp";
};
export declare function encodeBizPB(key: string, value: Record<string, unknown>): Uint8Array | null;
export declare function decodeBizPB(key: string, data: Uint8Array | ArrayBuffer): any;
export declare function toProtoMsgBody(elements: YuanbaoMsgBodyElement[]): any[];
export declare function fromProtoMsgBody(elements: any[]): YuanbaoMsgBodyElement[];
export declare function encodeSendC2CMessageReq(data: WsSendC2CMessageData): Uint8Array | null;
export declare function encodeSendGroupMessageReq(data: WsSendGroupMessageData): Uint8Array | null;
export declare function decodeInboundMessage(data: Uint8Array | ArrayBuffer): YuanbaoInboundMessage | null;
export declare function decodeSendC2CMessageRsp(data: Uint8Array | ArrayBuffer, msgId: string): WsSendMessageResponse | null;
export declare function decodeSendGroupMessageRsp(data: Uint8Array | ArrayBuffer, msgId: string): WsSendMessageResponse | null;
export declare function decodeSendMessageRsp(data: Uint8Array | ArrayBuffer, msgId: string): WsSendMessageResponse | null;
//# sourceMappingURL=biz-codec.d.ts.map