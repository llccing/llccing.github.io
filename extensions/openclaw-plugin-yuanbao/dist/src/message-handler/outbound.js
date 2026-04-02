import { logger, logSimple } from '../logger.js';
import { prepareOutboundContent, buildOutboundMsgBody } from './handlers/index.js';
import { downloadAndUploadMedia } from '../media.js';
import { ctxLog, YUANBAO_OVERFLOW_NOTICE_TEXT, } from './context.js';
export async function sendYuanbaoMessageBody(params) {
    const { toAccount, msgBody, fromAccount, ctx } = params;
    const info = (msg) => (ctx ? ctxLog(ctx, 'info', msg) : logSimple('info', msg));
    const error = (msg) => (ctx ? ctxLog(ctx, 'error', msg) : logSimple('error', msg));
    if (!ctx?.wsClient) {
        error('发送失败: WebSocket 客户端不可用');
        return { ok: false, error: 'wsClient not available' };
    }
    const msgRandom = Math.floor(Math.random() * 4294967295);
    try {
        const result = await ctx.wsClient.sendC2CMessage({
            to_account: toAccount,
            msg_body: msgBody,
            msg_random: msgRandom,
            ...(fromAccount ? { from_account: fromAccount } : {}),
        });
        if (result.code !== 0) {
            error(`发送失败: code=${result.code}, message=${result.message}`);
            return { ok: false, error: result.message || `code: ${result.code}` };
        }
        info(`[私聊] 发送成功 -> ${toAccount}, code: ${result.code}, msgId: ${result.msgId}`);
        return { ok: true, messageId: result.msgId };
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        error(`发送异常: ${errMsg}`);
        return { ok: false, error: errMsg };
    }
}
export async function sendYuanbaoMessage(params) {
    const { text, ...rest } = params;
    const items = prepareOutboundContent(text);
    const msgBody = buildOutboundMsgBody(items);
    return sendYuanbaoMessageBody({ ...rest, msgBody });
}
export async function sendYuanbaoGroupMessageBody(params) {
    const { groupId, msgBody, fromAccount, refMsgId, ctx } = params;
    if (!ctx?.wsClient) {
        logger.error('发送群消息失败: WebSocket 客户端不可用');
        return { ok: false, error: 'wsClient not available' };
    }
    const msgRandom = String(Math.floor(Math.random() * 4294967295));
    try {
        const result = await ctx.wsClient.sendGroupMessage({
            msg_id: refMsgId,
            group_id: groupId,
            random: msgRandom,
            msg_body: msgBody,
            ...(fromAccount ? { from_account: fromAccount } : {}),
            ...(refMsgId ? { ref_msg_id: refMsgId } : {}),
        });
        if (result.code !== 0) {
            logger.error(`群消息发送失败: code=${result.code}, message=${result.message}, msg=${result.msgId}`);
            return { ok: false, error: result.message || `code: ${result.code}` };
        }
        logger.info(`群消息发送成功 -> ${groupId}, msgId: ${result.msgId}`);
        return { ok: true, messageId: result.msgId };
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`群消息发送异常: ${errMsg}`);
        return { ok: false, error: errMsg };
    }
}
export async function sendYuanbaoGroupMessage(params) {
    const { text, ...rest } = params;
    const items = prepareOutboundContent(text);
    const msgBody = buildOutboundMsgBody(items);
    return sendYuanbaoGroupMessageBody({ ...rest, msgBody });
}
export async function sendMsgBodyDirect(params) {
    const { account, target, msgBody, wsClient } = params;
    if (target.startsWith('group:')) {
        const groupId = target.slice('group:'.length);
        return sendYuanbaoGroupMessageBody({
            account,
            groupId,
            msgBody,
            fromAccount: account.botId,
            ctx: {
                account,
                config: {},
                core: {},
                log: { info: () => { }, warn: () => { }, error: () => { }, verbose: () => { } },
                wsClient,
            },
        });
    }
    return sendYuanbaoMessageBody({
        account,
        toAccount: target,
        msgBody,
        fromAccount: account.botId,
        ctx: {
            account,
            config: {},
            core: {},
            log: { info: () => { }, warn: () => { }, error: () => { }, verbose: () => { } },
            wsClient,
        },
    });
}
export async function executeReply(params) {
    const { transport, ctx, account, core, replyRuntime, tableMode, splitFinalText, overflowPolicy, ctxPayload, mediaLocalRoots, } = params;
    if (ctx.abortSignal?.aborted) {
        ctxLog(params.ctx, 'warn', `[${params.account.accountId}] 回复已中止，跳过执行`);
        return;
    }
    const L = transport.label;
    const collectedTexts = [];
    const collectedMediaUrls = [];
    await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
        ctx: ctxPayload,
        cfg: replyRuntime.config,
        replyOptions: {
            disableBlockStreaming: replyRuntime.disableBlockStreaming,
        },
        dispatcherOptions: {
            deliver: async (payload, info) => {
                if (ctx.abortSignal?.aborted) {
                    ctxLog(ctx, 'warn', `[${account.accountId}] 回复已中止，停止处理后续回复块`);
                    return;
                }
                const text = core.channel.text.convertMarkdownTables(payload.text ?? '', tableMode);
                payload.mediaUrls?.forEach(url => collectedMediaUrls.push(url));
                if (!text.trim()) {
                    return;
                }
                collectedTexts.push(text);
            },
            onError: (err, info) => {
                if (ctx.abortSignal?.aborted) {
                    ctxLog(ctx, 'warn', `[${account.accountId}] 回复已中止，忽略 onError`);
                    return;
                }
                ctx.log.error(`[${account.accountId}] yuanbao ${L}${info.kind} reply failed: ${String(err)}`);
            },
        },
    });
    if (collectedTexts.length === 0 && collectedMediaUrls.length === 0) {
        ctxLog(ctx, 'warn', `[${L}] AI 未返回任何回复内容`);
        return;
    }
    await Promise.all([
        collectedTexts.length > 0
            ? sendTextReply({ text: collectedTexts.join('\n\n'), transport, ctx, overflowPolicy, splitFinalText, L })
            : Promise.resolve(),
        collectedMediaUrls.length > 0
            ? sendMediaUrls({ mediaUrls: collectedMediaUrls, transport, ctx, account, core, mediaLocalRoots, L })
            : Promise.resolve(),
    ]);
    ctx.statusSink?.({ lastOutboundAt: Date.now() });
}
async function sendTextReply(params) {
    const { text, transport, ctx, overflowPolicy, splitFinalText, L } = params;
    const sendChunk = async (chunk) => {
        const items = prepareOutboundContent(chunk);
        const result = transport.sendItems && items.some(i => i.type !== 'text')
            ? await transport.sendItems({ items })
            : await transport.sendText({ text: chunk });
        if (!result.ok)
            ctxLog(ctx, 'error', `[${L}] 发送文本失败: ${result.error}`);
        return result.ok;
    };
    const chunks = splitFinalText(text);
    if (chunks.length <= 1) {
        await sendChunk(text);
        return;
    }
    if (overflowPolicy === 'stop') {
        await sendChunk(chunks[0]);
        await transport.sendText({ text: YUANBAO_OVERFLOW_NOTICE_TEXT });
        return;
    }
    for (const chunk of chunks) {
        if (!await sendChunk(chunk))
            break;
    }
}
async function sendMediaUrls(params) {
    const { mediaUrls, transport, ctx, account, core, mediaLocalRoots, L } = params;
    for (const mediaUrl of mediaUrls) {
        if (ctx.abortSignal?.aborted) {
            ctxLog(ctx, 'warn', `[${account.accountId}] 回复已中止，停止发送媒体`);
            break;
        }
        if (!transport.sendItems) {
            await transport.sendText({ text: mediaUrl });
            continue;
        }
        try {
            ctxLog(ctx, 'info', `[${L}] 上传并发送媒体: ${mediaUrl}`);
            const uploadResult = await downloadAndUploadMedia(mediaUrl, core, account, mediaLocalRoots);
            const item = uploadResult.mimeType.startsWith('image/')
                ? {
                    type: 'image',
                    url: uploadResult.url,
                    uuid: uploadResult.uuid,
                    imageInfoArray: [{
                            type: 1,
                            url: uploadResult.url,
                            size: uploadResult.size,
                            width: uploadResult.imageInfo?.width ?? 512,
                            height: uploadResult.imageInfo?.height ?? 512,
                        }],
                }
                : { type: 'file', url: uploadResult.url, fileName: uploadResult.filename, fileSize: uploadResult.size };
            const result = await transport.sendItems({ items: [item] });
            if (!result.ok)
                ctxLog(ctx, 'error', `[${L}] 媒体发送失败: ${result.error}`);
        }
        catch (err) {
            ctxLog(ctx, 'error', `[${L}] 媒体上传/发送异常: ${String(err)}`);
        }
    }
}
//# sourceMappingURL=outbound.js.map