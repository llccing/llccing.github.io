import { YuanbaoWsClient } from './client.js';
import { LOG_PREFIX, logger, sanitize } from '../../logger.js';
import { handleInboundMessage, } from '../../message-handler/index.js';
import { setActiveWsClient } from './runtime.js';
import { decodeInboundMessage } from './biz-codec.js';
import { getSignToken } from '../api.js';
export async function startYuanbaoWsGateway(params) {
    const { account, config, abortSignal, log, runtime, statusSink } = params;
    const auth = await resolveWsAuth(account, log);
    const client = new YuanbaoWsClient({
        connection: {
            gatewayUrl: account.wsGatewayUrl,
            auth,
        },
        config: {
            maxReconnectAttempts: account.wsMaxReconnectAttempts,
        },
        callbacks: {
            onReady: (data) => {
                log?.info?.(`${LOG_PREFIX}[${account.accountId}] WebSocket 已就绪: connectId=${data.connectId}`);
                statusSink?.({
                    running: true,
                    connected: true,
                    wsConnectId: data.connectId,
                    lastConnectedAt: Date.now(),
                });
            },
            onDispatch: (pushEvent) => {
                log?.debug?.(`${LOG_PREFIX}[${account.accountId}] WS 推送: cmd=${pushEvent.cmd}, type=${pushEvent.type}`);
                handleWsDispatchEvent({ account, config, pushEvent, log, runtime, client, statusSink, abortSignal });
            },
            onStateChange: (state) => {
                log?.info?.(`${LOG_PREFIX}[${account.accountId}] WS 状态: ${state}`);
                statusSink?.({
                    wsState: state,
                    connected: state === 'connected',
                    running: state !== 'disconnected',
                });
            },
            onError: (error) => {
                log?.error?.(`${LOG_PREFIX}[${account.accountId}] WS 错误: ${error.message}`);
                statusSink?.({ lastError: error.message });
            },
            onClose: (code, reason) => {
                log?.info?.(`${LOG_PREFIX}[${account.accountId}] WS 关闭: code=${code}, reason=${reason}`);
            },
            onKickout: (data) => {
                log?.warn?.(`${LOG_PREFIX}[${account.accountId}] 被踢下线: status=${data.status}, reason=${data.reason}`);
                statusSink?.({ kickedOut: true, kickReason: data.reason });
            },
        },
        log: {
            info: msg => log?.info?.(msg),
            warn: msg => log?.warn?.(msg),
            error: msg => log?.error?.(msg),
            debug: msg => log?.debug?.(msg),
        },
    });
    client.connect();
    setActiveWsClient(account.accountId, client);
    return new Promise((resolve) => {
        const onAbort = () => {
            log?.info?.(`${LOG_PREFIX}[${account.accountId}] 收到停止信号，断开 WebSocket`);
            setActiveWsClient(account.accountId, null);
            client.disconnect();
            statusSink?.({
                running: false,
                connected: false,
                lastStopAt: Date.now(),
            });
            resolve();
        };
        if (abortSignal.aborted) {
            onAbort();
            return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
    });
}
async function resolveWsAuth(account, log) {
    log?.info?.(`${LOG_PREFIX}[${account.accountId}] resolveWsAuth 入参: botId=${account.botId}, identifier=${account.identifier}, hasToken=${!!account.token}`);
    if (account.token) {
        const uid = account.botId || account.identifier || '';
        log?.info?.(`${LOG_PREFIX}[${account.accountId}] 使用预配置的静态 token, uid=${uid} (botId=${account.botId}, identifier=${account.identifier})`);
        return {
            bizId: 'ybBot',
            uid,
            source: 'bot',
            token: account.token,
            routeEnv: account.config?.routeEnv,
        };
    }
    const tokenData = await getSignToken(account, log);
    const uid = tokenData.bot_id || account.botId || account.identifier || '';
    if (tokenData.bot_id) {
        account.botId = tokenData.bot_id;
    }
    log?.info?.(`${LOG_PREFIX}[${account.accountId}] 签票完成 uid=${uid} (bot_id=${tokenData.bot_id}, botId=${account.botId}, identifier=${account.identifier})`);
    return {
        bizId: 'ybBot',
        uid,
        source: tokenData.source || 'bot',
        token: tokenData.token,
        routeEnv: account.config?.routeEnv,
    };
}
function parsePushContentToMsgBody(content) {
    if (typeof content === 'string' && content.trim()) {
        try {
            const parsed = JSON.parse(content);
            if (parsed?.msg_body && Array.isArray(parsed.msg_body)) {
                return parsed.msg_body;
            }
            if (parsed?.text) {
                return [{ msg_type: 'TIMTextElem', msg_content: { text: parsed.text } }];
            }
        }
        catch {
        }
        return [{ msg_type: 'TIMTextElem', msg_content: { text: content } }];
    }
    return undefined;
}
function inferChatType(msg) {
    return (msg.group_id || msg.callback_command === 'Group.CallbackAfterSendMsg') ? 'group' : 'c2c';
}
function hasValidMsgFields(msg) {
    return Boolean(msg.callback_command || msg.from_account || msg.msg_body);
}
function decodeFromProtobuf(rawData, pushType) {
    const decoded = decodeInboundMessage(rawData);
    if (!decoded || !hasValidMsgFields(decoded))
        return null;
    logger.debug(`[${pushType}] WS 推送事件解析, decoded=${sanitize(decoded)}`);
    return { msg: decoded, chatType: inferChatType(decoded) };
}
function decodeFromRawDataJson(rawData, pushType) {
    try {
        const rawJson = JSON.parse(new TextDecoder().decode(rawData));
        if (!rawJson || !hasValidMsgFields(rawJson))
            return null;
        logger.info(`[${pushType}] WS 推送事件解析, rawJson=${sanitize(rawJson)}`);
        return { msg: rawJson, chatType: inferChatType(rawJson) };
    }
    catch {
        return null;
    }
}
function decodeFromContent(pushEvent) {
    const msgBody = parsePushContentToMsgBody(pushEvent.content);
    if (!msgBody)
        return null;
    let parsedContent = {};
    try {
        parsedContent = JSON.parse(pushEvent.content);
    }
    catch { }
    const chatType = parsedContent.group_id ? 'group' : 'c2c';
    return {
        msg: {
            callback_command: chatType === 'group' ? 'Group.CallbackAfterSendMsg' : 'C2C.CallbackAfterSendMsg',
            from_account: parsedContent.from_account,
            group_id: parsedContent.group_id,
            msg_body: msgBody,
            msg_key: parsedContent.msg_key,
            msg_seq: parsedContent.msg_seq,
            msg_time: parsedContent.msg_time,
        },
        chatType,
    };
}
export function wsPushToInboundMessage(pushEvent, log) {
    if (pushEvent.rawData && pushEvent.rawData.length > 0) {
        const pushType = String(pushEvent.type ?? 'rawData');
        log?.debug?.(`${LOG_PREFIX} [${pushType}] WS 推送事件解析, type=rawData`);
        const result = decodeFromProtobuf(pushEvent.rawData, pushType)
            ?? decodeFromRawDataJson(pushEvent.rawData, pushType);
        if (result)
            return result;
        log?.warn?.(`${LOG_PREFIX} [${pushType}] WS 推送事件解析失败`);
    }
    if (pushEvent.content) {
        log?.debug?.(`${LOG_PREFIX} [${pushEvent.type || 'content'}] WS 推送事件解析, type=content, content=${sanitize(pushEvent.content)}`);
        return decodeFromContent(pushEvent);
    }
    return null;
}
function handleWsDispatchEvent(params) {
    const { account, config, pushEvent, log: gwLog, runtime, client, statusSink, abortSignal } = params;
    gwLog?.debug?.(`${LOG_PREFIX}[${account.accountId}][ws][dispatch] cmd=${pushEvent.cmd}, module=${pushEvent.module}, msgId=${pushEvent.msgId}`);
    const converted = wsPushToInboundMessage(pushEvent, gwLog);
    if (!converted) {
        gwLog?.debug?.(`${LOG_PREFIX}[${account.accountId}][ws][dispatch] cmd=${pushEvent.cmd} (非消息事件，跳过)`);
        return;
    }
    const { msg, chatType } = converted;
    gwLog?.info?.(`${LOG_PREFIX}[${account.accountId}][ws][dispatch] 收到 ${chatType === 'group' ? '群消息' : '私聊'}消息`);
    if (statusSink) {
        statusSink({ lastInboundAt: Date.now() });
    }
    if (!runtime) {
        gwLog?.warn?.(`${LOG_PREFIX}[${account.accountId}] PluginRuntime 未提供，无法处理消息`);
        return;
    }
    const handlerCtx = {
        account,
        config,
        core: runtime,
        log: {
            info: (m) => gwLog?.info?.(m),
            warn: (m) => gwLog?.warn?.(m),
            error: (m) => gwLog?.error?.(m),
            verbose: (m) => gwLog?.debug?.(m),
        },
        statusSink: statusSink,
        wsClient: client,
        abortSignal,
    };
    handleInboundMessage({ ctx: handlerCtx, msg, chatType }).catch((err) => {
        gwLog?.error?.(`${LOG_PREFIX}[${account.accountId}] WS ${chatType === 'group' ? 'group ' : ''}message handler failed: ${String(err)}`);
    });
}
//# sourceMappingURL=gateway.js.map