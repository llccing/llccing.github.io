import type { WsClientCallbacks, WsClientConfig, WsClientState, WsConnectionConfig, WsSendMessageResponse, WsSendC2CMessageData, WsSendGroupMessageData } from './types.js';
type LogSink = {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string) => void;
    debug?: (msg: string) => void;
};
export declare const BIZ_CMD: {
    readonly SendC2CMessage: "send_c2c_message";
    readonly SendGroupMessage: "send_group_message";
};
export declare class YuanbaoWsClient {
    private readonly connectionConfig;
    private readonly clientConfig;
    private readonly callbacks;
    private readonly log;
    private ws;
    private state;
    private connectId;
    private heartbeatIntervalS;
    private heartbeatTimer;
    private heartbeatAckReceived;
    private lastHeartbeatAt;
    private heartbeatTimeoutCount;
    private reconnectAttempts;
    private reconnectTimer;
    private abortController;
    private disposed;
    private pendingRequests;
    constructor(params: {
        connection: WsConnectionConfig;
        config?: WsClientConfig;
        callbacks?: WsClientCallbacks;
        log?: LogSink;
    });
    connect(): void;
    disconnect(): void;
    getState(): WsClientState;
    getConnectId(): string | null;
    sendBinary(data: Uint8Array): boolean;
    sendAndWait(cmd: string, module: string, data: Uint8Array, timeoutMs?: number): Promise<WsSendMessageResponse>;
    sendC2CMessage(data: WsSendC2CMessageData): Promise<WsSendMessageResponse>;
    sendGroupMessage(data: WsSendGroupMessageData): Promise<WsSendMessageResponse>;
    private doConnect;
    private onMessage;
    private handleConnMsg;
    private onResponse;
    private sendAuthBind;
    private onAuthBindResponse;
    private startHeartbeat;
    private stopHeartbeat;
    private scheduleNextPingCheck;
    private sendPing;
    private onPingResponse;
    private onPush;
    private onBusinessResponse;
    private getReconnectDelay;
    private scheduleReconnect;
    private setState;
    private closeCurrentWs;
    private cleanup;
}
export {};
//# sourceMappingURL=client.d.ts.map