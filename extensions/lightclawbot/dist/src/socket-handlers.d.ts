/**
 * LightClaw — Socket.IO 事件处理器
 *
 * 将 socket 事件监听（message:private、history:request、sessions:request）
 * 从 gateway 主逻辑中解耦。
 */
import type { Socket } from "socket.io-client";
import type { GatewayContext, QueuedMessage } from "./types.js";
export interface SocketHandlerDeps {
    account: GatewayContext["account"];
    botClientId: string;
    log?: GatewayContext["log"];
    enqueueMessage: (msg: QueuedMessage) => void;
    /** 收到入站事件时调用，通知框架更新 lastEventAt */
    onEvent?: () => void;
}
/**
 * 绑定所有 Socket.IO 事件监听器
 */
export declare function bindSocketHandlers(socket: Socket, deps: SocketHandlerDeps): void;
//# sourceMappingURL=socket-handlers.d.ts.map