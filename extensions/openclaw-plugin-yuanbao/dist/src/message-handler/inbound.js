import { recordPendingHistoryEntryIfEnabled, buildPendingHistoryContextFromMap, clearHistoryEntriesIfEnabled, } from 'openclaw/plugin-sdk';
import { downloadMediasToLocalFiles } from '../media.js';
import { ctxLog, ctxVerbose, resolveOutboundSenderAccount, rewriteSlashCommand, splitTextByUtf8ByteLength, YUANBAO_FINAL_TEXT_CHUNK_LIMIT, } from './context.js';
import { extractTextFromMsgBody } from './extract.js';
import { sendYuanbaoMessage, sendYuanbaoMessageBody, sendYuanbaoGroupMessageBody, executeReply, } from './outbound.js';
import { buildOutboundMsgBody, prepareOutboundContent } from './handlers/index.js';
import { parseQuoteFromCloudCustomData, formatQuoteContext } from './quote.js';
import { textDesensitization } from '../utils.js';
import { recordUser, getConversationKey } from '../user-tracker.js';
const chatHistories = new Map();
const conversationQueues = new Map();
function enqueueForConversation(key, task) {
    const prev = conversationQueues.get(key) ?? Promise.resolve();
    const taskResult = prev.then(() => task());
    const queued = taskResult.catch(() => undefined);
    conversationQueues.set(key, queued);
    queued.finally(() => {
        if (conversationQueues.get(key) === queued) {
            conversationQueues.delete(key);
        }
    });
    return taskResult;
}
function buildReplyRuntimeConfig(config) {
    return {
        config,
        disableBlockStreaming: true,
    };
}
function buildGroupHistoryContext(params) {
    const { core, groupId, body, historyLimit, envelopeOptions } = params;
    const combinedBody = buildPendingHistoryContextFromMap({
        historyMap: chatHistories,
        historyKey: groupId,
        limit: historyLimit,
        currentMessage: body,
        formatEntry: entry => core.channel.reply.formatAgentEnvelope({
            channel: 'YUANBAO',
            from: `group:${groupId}:${entry.sender}`,
            timestamp: entry.timestamp,
            body: entry.body,
            envelope: envelopeOptions,
        }),
    });
    const inboundHistory = historyLimit > 0
        ? (chatHistories.get(groupId) ?? []).map(entry => ({
            sender: entry.sender,
            body: entry.body,
            timestamp: entry.timestamp,
        }))
        : undefined;
    return { combinedBody, inboundHistory };
}
async function handleC2CMessage(params) {
    const { ctx, msg } = params;
    const { core } = ctx;
    const { config } = ctx;
    const { account } = ctx;
    const fromAccount = msg.from_account?.trim() || 'unknown';
    const senderNickname = msg.sender_nickname?.trim() || undefined;
    const outboundSender = resolveOutboundSenderAccount(account);
    if (outboundSender && fromAccount === outboundSender) {
        ctxLog(ctx, 'info', `跳过机器人自身消息 <- ${fromAccount}`);
        return;
    }
    const { rawBody, medias } = extractTextFromMsgBody(ctx, msg.msg_body);
    ctxLog(ctx, 'info', `收到消息 <- ${fromAccount}${senderNickname ? `(${senderNickname})` : ''}, msgKey: ${msg.msg_key}`);
    ctxVerbose(ctx, `消息内容: ${textDesensitization(rawBody)}`);
    const quoteInfo = parseQuoteFromCloudCustomData(msg.cloud_custom_data);
    if (quoteInfo) {
        ctxLog(ctx, 'info', `检测到引用消息, 引用来自: ${quoteInfo.sender_nickname || quoteInfo.sender_id || 'unknown'}`);
        ctxVerbose(ctx, `引用内容: ${textDesensitization(quoteInfo.desc || '')}`);
    }
    const userConvKey = getConversationKey(account.accountId, 'c2c', fromAccount);
    recordUser(userConvKey, fromAccount, senderNickname || fromAccount);
    if (!rawBody.trim()) {
        ctxLog(ctx, 'warn', '消息内容为空，跳过处理');
        return;
    }
    if (/^\[.+\]$/.test(rawBody.trim()) && medias.length === 0) {
        ctxVerbose(ctx, `占位符消息，跳过处理: ${rawBody} (from: ${fromAccount})`);
        return;
    }
    const rewrittenBody = rewriteSlashCommand(rawBody, (orig, rewritten) => {
        ctxLog(ctx, 'info', `命令改写: "${orig}" -> "${rewritten}"`);
    });
    const bodyWithQuote = quoteInfo
        ? `${formatQuoteContext(quoteInfo)}\n${rewrittenBody}`
        : rewrittenBody;
    ctxVerbose(ctx, `开始处理消息, 账号: ${account.accountId}`);
    const mediaResults = await downloadMediasToLocalFiles(medias, account, core, {
        verbose: msg => ctxVerbose(ctx, msg),
        warn: msg => ctxLog(ctx, 'warn', msg),
    });
    const mediaPaths = mediaResults.map(r => r.path);
    const mediaTypes = mediaResults.map(r => r.contentType);
    const route = core.channel.routing.resolveAgentRoute({
        cfg: config,
        channel: 'yuanbao',
        accountId: account.accountId,
        peer: { kind: 'dm', id: fromAccount },
    });
    ctxVerbose(ctx, `processing message from ${fromAccount}, agentId=${route.agentId}`);
    const fromLabel = `user:${fromAccount}`;
    const storePath = core.channel.session.resolveStorePath(config.session?.store, {
        agentId: route.agentId,
    });
    const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(config);
    const previousTimestamp = core.channel.session.readSessionUpdatedAt({
        storePath,
        sessionKey: route.sessionKey,
    });
    const body = core.channel.reply.formatAgentEnvelope({
        channel: 'YUANBAO',
        from: fromLabel,
        previousTimestamp,
        envelope: envelopeOptions,
        body: bodyWithQuote,
    });
    const ctxPayload = core.channel.reply.finalizeInboundContext({
        Body: body,
        RawBody: bodyWithQuote,
        CommandBody: bodyWithQuote,
        From: `yuanbao:${fromAccount}`,
        To: `yuanbao:${msg.to_account || 'bot'}`,
        SessionKey: route.sessionKey,
        AccountId: route.accountId,
        ChatType: 'direct',
        ConversationLabel: fromLabel,
        SenderName: senderNickname || fromAccount,
        SenderId: fromAccount,
        Provider: 'yuanbao',
        Surface: 'yuanbao',
        MessageSid: msg.msg_key,
        OriginatingChannel: 'yuanbao',
        OriginatingTo: `yuanbao:${fromAccount}`,
        ...(mediaPaths.length > 0 && { MediaPaths: mediaPaths, MediaPath: mediaPaths[0] }),
        ...(mediaTypes.length > 0 && { MediaTypes: mediaTypes, MediaType: mediaTypes[0] }),
    });
    await core.channel.session.recordInboundSession({
        storePath,
        sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
        ctx: ctxPayload,
        onRecordError: (err) => {
            ctx.log.error(`yuanbao: failed updating session meta: ${String(err)}`);
        },
    });
    const tableMode = core.channel.text.resolveMarkdownTableMode({
        cfg: config,
        channel: 'yuanbao',
        accountId: account.accountId,
    });
    const finalTextChunkLimit = core.channel.text.resolveTextChunkLimit(config, 'yuanbao', account.accountId, {
        fallbackLimit: YUANBAO_FINAL_TEXT_CHUNK_LIMIT,
    });
    const splitFinalText = (text) => splitTextByUtf8ByteLength(text, finalTextChunkLimit);
    ctxVerbose(ctx, `开始生成回复 -> ${fromAccount}`);
    ctxVerbose(ctx, `转发给 OpenClaw: RawBody=${rawBody.slice(0, 100)}, SessionKey=${ctxPayload.SessionKey}, From=${ctxPayload.From}`);
    const transport = {
        label: '',
        sendText: p => sendYuanbaoMessage({
            account,
            toAccount: fromAccount,
            text: p.text,
            fromAccount: outboundSender,
            ctx,
        }),
        sendItems: p => sendYuanbaoMessageBody({
            account,
            toAccount: fromAccount,
            msgBody: buildOutboundMsgBody(p.items),
            fromAccount: outboundSender,
            ctx,
        }),
    };
    const replyRuntime = buildReplyRuntimeConfig(config);
    await executeReply({
        transport,
        ctx,
        account,
        core,
        config,
        ctxPayload,
        replyRuntime,
        tableMode,
        splitFinalText,
        overflowPolicy: account.overflowPolicy,
    });
    ctxLog(ctx, 'info', `消息处理完成 <- ${fromAccount}`);
}
async function handleGroupMessage(params) {
    const { ctx, msg } = params;
    const { core } = ctx;
    const { config } = ctx;
    const { account } = ctx;
    const groupId = msg.group_id?.trim() || 'unknown';
    const fromAccount = msg.from_account?.trim() || 'unknown';
    const senderNickname = msg.sender_nickname?.trim() || undefined;
    const outboundSender = resolveOutboundSenderAccount(account);
    if (outboundSender && fromAccount === outboundSender) {
        ctxLog(ctx, 'info', `跳过机器人自身消息 <- group:${groupId}, from: ${fromAccount}`);
        return;
    }
    const { rawBody, isAtBot, medias } = extractTextFromMsgBody(ctx, msg.msg_body);
    ctxLog(ctx, 'info', `收到群消息 <- group:${groupId}, from: ${fromAccount}${senderNickname ? `(${senderNickname})` : ''}, msgSeq: ${msg.msg_seq}, isAtBot: ${isAtBot}`);
    ctxVerbose(ctx, `群消息内容: ${textDesensitization(rawBody)}`);
    const quoteInfo = parseQuoteFromCloudCustomData(msg.cloud_custom_data);
    if (quoteInfo) {
        ctxLog(ctx, 'info', `群消息检测到引用消息, 引用来自: ${quoteInfo.sender_nickname || quoteInfo.sender_id || 'unknown'}`);
        ctxVerbose(ctx, `引用内容: ${textDesensitization(quoteInfo.desc || '')}`);
    }
    const convKey = getConversationKey(account.accountId, 'group', groupId);
    recordUser(convKey, fromAccount, senderNickname || fromAccount);
    if (!rawBody.trim() && medias.length === 0 && !isAtBot) {
        ctxLog(ctx, 'warn', '群消息内容为空，跳过处理');
        return;
    }
    ctxVerbose(ctx, `开始处理群消息, 账号: ${account.accountId}, group: ${groupId}`);
    const { historyLimit } = account;
    if (!isAtBot) {
        ctxLog(ctx, 'info', `非@机器人消息，已记录到群历史上下文，跳过回复 <- group:${groupId}, from: ${fromAccount}`);
        if (historyLimit > 0) {
            recordPendingHistoryEntryIfEnabled({
                historyMap: chatHistories,
                historyKey: groupId,
                limit: historyLimit,
                entry: {
                    sender: fromAccount,
                    body: `${fromAccount}: ${rawBody}`,
                    timestamp: Date.now(),
                    messageId: msg.msg_key ?? String(msg.msg_seq ?? ''),
                    medias: medias.length > 0 ? medias : undefined,
                },
            });
        }
        return;
    }
    const rewrittenBody = rewriteSlashCommand(rawBody, (orig, rewritten) => {
        ctxLog(ctx, 'info', `群命令改写: "${orig}" -> "${rewritten}"`);
    });
    const bodyWithQuote = quoteInfo
        ? `${formatQuoteContext(quoteInfo)}\n${rewrittenBody}`
        : rewrittenBody;
    ctxVerbose(ctx, `开始处理群消息, 账号: ${account.accountId}, group: ${groupId}`);
    const historyMedias = (chatHistories.get(groupId) ?? [])
        .filter(entry => entry.sender === fromAccount).slice(-1)
        ?.flatMap(entry => entry.medias ?? []);
    const allMedias = [...historyMedias || [], ...medias];
    const mediaResults = await downloadMediasToLocalFiles(allMedias, account, core, {
        verbose: msg => ctxVerbose(ctx, msg),
        warn: msg => ctxLog(ctx, 'warn', msg),
    });
    const mediaPaths = mediaResults.map(r => r.path);
    const mediaTypes = mediaResults.map(r => r.contentType);
    const route = core.channel.routing.resolveAgentRoute({
        cfg: config,
        channel: 'yuanbao',
        accountId: account.accountId,
        peer: { kind: 'group', id: groupId },
    });
    ctxVerbose(ctx, `processing group message from ${fromAccount} in ${groupId}, agentId=${route.agentId}`);
    const groupLabel = `group:${groupId}`;
    const senderLabel = `user:${fromAccount}`;
    const storePath = core.channel.session.resolveStorePath(config.session?.store, {
        agentId: route.agentId,
    });
    const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(config);
    const previousTimestamp = core.channel.session.readSessionUpdatedAt({
        storePath,
        sessionKey: route.sessionKey,
    });
    const body = core.channel.reply.formatAgentEnvelope({
        channel: 'YUANBAO',
        from: groupLabel,
        previousTimestamp,
        envelope: envelopeOptions,
        body: bodyWithQuote,
        chatType: 'group',
        senderLabel,
    });
    const { combinedBody, inboundHistory } = buildGroupHistoryContext({
        core,
        groupId,
        body,
        historyLimit,
        envelopeOptions,
    });
    const ctxPayload = core.channel.reply.finalizeInboundContext({
        Body: combinedBody,
        BodyForAgent: bodyWithQuote,
        InboundHistory: inboundHistory,
        RawBody: bodyWithQuote,
        CommandBody: bodyWithQuote,
        From: `yuanbao:group:${groupId}`,
        To: `yuanbao:${msg.to_account || 'bot'}`,
        SessionKey: route.sessionKey,
        AccountId: route.accountId,
        ChatType: 'group',
        ConversationLabel: groupLabel,
        GroupSubject: msg.group_name || undefined,
        SenderName: senderNickname || fromAccount,
        SenderId: fromAccount,
        Provider: 'yuanbao',
        Surface: 'yuanbao',
        MessageSid: msg.msg_key ?? String(msg.msg_seq ?? ''),
        OriginatingChannel: 'yuanbao',
        OriginatingTo: `yuanbao:group:${groupId}`,
        ...(mediaPaths.length > 0 && { MediaPaths: mediaPaths, MediaPath: mediaPaths[0] }),
        ...(mediaTypes.length > 0 && { MediaTypes: mediaTypes, MediaType: mediaTypes[0] }),
    });
    await core.channel.session.recordInboundSession({
        storePath,
        sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
        ctx: ctxPayload,
        onRecordError: (err) => {
            ctx.log.error(`yuanbao: failed updating group session meta: ${String(err)}`);
        },
    });
    const tableMode = core.channel.text.resolveMarkdownTableMode({
        cfg: config,
        channel: 'yuanbao',
        accountId: account.accountId,
    });
    const finalTextChunkLimit = core.channel.text.resolveTextChunkLimit(config, 'yuanbao', account.accountId, {
        fallbackLimit: YUANBAO_FINAL_TEXT_CHUNK_LIMIT,
    });
    const splitFinalText = (text) => splitTextByUtf8ByteLength(text, finalTextChunkLimit);
    ctxVerbose(ctx, `开始生成群回复 -> group:${groupId}`);
    const refMsgId = msg.msg_key || msg.msg_id || undefined;
    const transport = {
        label: '群',
        sendText: (p) => {
            const contentItems = prepareOutboundContent(p.text);
            const contentMsgBody = buildOutboundMsgBody(contentItems);
            return sendYuanbaoGroupMessageBody({
                account,
                groupId,
                msgBody: contentMsgBody,
                fromAccount: outboundSender,
                refMsgId,
                ctx,
            });
        },
        sendItems: (p) => {
            const contentMsgBody = buildOutboundMsgBody(p.items);
            return sendYuanbaoGroupMessageBody({
                account,
                groupId,
                msgBody: contentMsgBody,
                fromAccount: outboundSender,
                refMsgId,
                ctx,
            });
        },
    };
    const replyRuntime = buildReplyRuntimeConfig(config);
    await executeReply({
        transport,
        ctx,
        account,
        core,
        config,
        ctxPayload,
        replyRuntime,
        tableMode,
        splitFinalText,
        overflowPolicy: account.overflowPolicy,
    });
    clearHistoryEntriesIfEnabled({
        historyMap: chatHistories,
        historyKey: groupId,
        limit: historyLimit,
    });
    ctxLog(ctx, 'info', `群消息处理完成 <- group:${groupId}, from: ${fromAccount}`);
}
export async function handleInboundMessage(params) {
    const { ctx, msg, chatType } = params;
    const convKey = chatType === 'group'
        ? `group:${ctx.account.accountId}:${msg.group_id?.trim() || 'unknown'}`
        : `c2c:${ctx.account.accountId}:${msg.from_account?.trim() || 'unknown'}`;
    return enqueueForConversation(convKey, () => (chatType === 'group'
        ? handleGroupMessage({ ctx, msg })
        : handleC2CMessage({ ctx, msg })));
}
//# sourceMappingURL=inbound.js.map