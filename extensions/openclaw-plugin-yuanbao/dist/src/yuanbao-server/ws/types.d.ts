import type { YuanbaoMsgBodyElement } from '../../types.js';
export type WsConnectionConfig = {
    gatewayUrl: string;
    auth: {
        bizId: string;
        uid: string;
        source: string;
        token: string;
        routeEnv?: string;
    };
};
export type WsClientConfig = {
    maxReconnectAttempts?: number;
    reconnectDelays?: number[];
};
export type WsClientState = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'reconnecting';
export type WsAuthBindResult = {
    connectId: string;
    timestamp: number;
    clientIp: string;
};
export type WsClientCallbacks = {
    onReady?: (data: WsAuthBindResult) => void;
    onDispatch?: (pushData: WsPushEvent) => void;
    onStateChange?: (state: WsClientState) => void;
    onError?: (error: Error) => void;
    onClose?: (code: number, reason: string) => void;
    onKickout?: (data: {
        status: number;
        reason: string;
        otherDeviceName?: string;
    }) => void;
};
export type WsPushEvent = {
    type?: number;
    content?: string;
    cmd?: string;
    module?: string;
    msgId?: string;
    rawData?: Uint8Array;
};
export type WsSendC2CMessageData = {
    to_account: string;
    msg_body: YuanbaoMsgBodyElement[];
    from_account?: string;
    msg_id?: string;
    msg_random?: number;
};
export type WsSendGroupMessageData = {
    group_id: string;
    msg_body: YuanbaoMsgBodyElement[];
    from_account?: string;
    to_account?: string;
    msg_id?: string;
    random?: string;
    ref_msg_id?: string;
};
export type WsOutboundMessageData = WsSendC2CMessageData | WsSendGroupMessageData;
export type WsSendMessageResponse = {
    msgId: string;
    code: number;
    message: string;
};
//# sourceMappingURL=types.d.ts.map