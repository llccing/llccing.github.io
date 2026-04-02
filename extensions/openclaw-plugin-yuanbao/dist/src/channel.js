import { DEFAULT_ACCOUNT_ID, deleteAccountFromConfigSection, formatPairingApproveHint, setAccountEnabledInConfigSection, } from 'openclaw/plugin-sdk';
import { listYuanbaoAccountIds, resolveDefaultYuanbaoAccountId, resolveYuanbaoAccount } from './accounts.js';
import { yuanbaoConfigSchema } from './config-schema.js';
import { yuanbaoOnboardingAdapter } from './onboarding.js';
import { yuanbaoSetupAdapter } from './setup.js';
import { startYuanbaoWsGateway, getActiveWsClient } from './yuanbao-server/ws/index.js';
import { getYuanbaoRuntime } from './runtime.js';
import { sendYuanbaoMessage, sendYuanbaoGroupMessage } from './message-handler/index.js';
import { downloadAndUploadMedia, buildImageMsgBody, buildFileMsgBody, guessMimeType } from './media.js';
function toChannelResult(result) {
    return {
        channel: 'yuanbao',
        ok: result.ok,
        messageId: result.messageId ?? '',
        error: result.error ? new Error(result.error) : undefined,
    };
}
async function sendTextToTarget(account, target, text, wsClient) {
    const minCtx = wsClient
        ? {
            account,
            config: {},
            core: {},
            log: { info: () => { }, warn: () => { }, error: () => { }, verbose: () => { } },
            wsClient,
        }
        : undefined;
    if (target.startsWith('group:')) {
        return sendYuanbaoGroupMessage({ account, groupId: target.slice('group:'.length), text, fromAccount: account.botId, ctx: minCtx });
    }
    return sendYuanbaoMessage({ account, toAccount: target, text, fromAccount: account.botId, ctx: minCtx });
}
function buildMediaMsgBodyFromUpload(uploadResult) {
    const mime = guessMimeType(uploadResult.filename);
    return mime.startsWith('image/')
        ? buildImageMsgBody({ url: uploadResult.url, filename: uploadResult.filename, size: uploadResult.size })
        : buildFileMsgBody({ url: uploadResult.url, filename: uploadResult.filename, size: uploadResult.size });
}
async function sendMediaFallbackAsText(account, target, text, mediaUrl, uploadErrMsg) {
    const fallbackText = text ? `${text}\n${mediaUrl}` : mediaUrl;
    const fallback = await sendTextToTarget(account, target, fallbackText);
    return {
        channel: 'yuanbao',
        ok: fallback.ok,
        messageId: fallback.messageId ?? '',
        error: fallback.ok ? undefined : new Error(`媒体上传失败(${uploadErrMsg}), 降级发送文本也失败: ${fallback.error}`),
    };
}
const meta = {
    id: 'yuanbao',
    label: '元宝 Bot',
    selectionLabel: '元宝 Bot (yuanbao)',
    detailLabel: '元宝 Bot',
    docsPath: '/channels/yuanbao',
    docsLabel: 'yuanbao',
    blurb: 'YuanBao bot via WebSocket.',
    aliases: ['yuanbao', '元宝', '即时通信'],
    order: 85,
    quickstartAllowFrom: true,
};
function normalizeYuanbaoMessagingTarget(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return undefined;
    return trimmed.replace(/^(yuanbao):/i, '').trim() || undefined;
}
export const yuanbaoPlugin = {
    id: 'yuanbao',
    meta,
    onboarding: yuanbaoOnboardingAdapter,
    setup: yuanbaoSetupAdapter,
    capabilities: {
        chatTypes: ['direct', 'group'],
        media: true,
        reactions: false,
        threads: false,
        polls: false,
        nativeCommands: false,
    },
    reload: { configPrefixes: ['channels.yuanbao'] },
    configSchema: yuanbaoConfigSchema,
    config: {
        listAccountIds: cfg => listYuanbaoAccountIds(cfg),
        resolveAccount: (cfg, accountId) => resolveYuanbaoAccount({ cfg: cfg, accountId }),
        defaultAccountId: cfg => resolveDefaultYuanbaoAccountId(cfg),
        setAccountEnabled: ({ cfg, accountId, enabled }) => setAccountEnabledInConfigSection({
            cfg: cfg,
            sectionKey: 'yuanbao',
            accountId,
            enabled,
            allowTopLevel: true,
        }),
        deleteAccount: ({ cfg, accountId }) => deleteAccountFromConfigSection({
            cfg: cfg,
            sectionKey: 'yuanbao',
            clearBaseFields: ['name', 'appKey', 'appSecret', 'identifier', 'apiDomain', 'typingText', 'streamingMode', 'fallbackPolicy', 'overflowPolicy'],
            accountId,
        }),
        isConfigured: account => account.configured,
        describeAccount: (account) => ({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: account.configured,
        }),
        resolveAllowFrom: ({ cfg, accountId }) => {
            const account = resolveYuanbaoAccount({ cfg: cfg, accountId });
            return (account.config.dm?.allowFrom ?? []).map(entry => String(entry));
        },
        formatAllowFrom: ({ allowFrom }) => allowFrom
            .map(entry => String(entry).trim())
            .filter(Boolean)
            .map(entry => entry.toLowerCase()),
    },
    security: {
        resolveDmPolicy: ({ cfg, accountId, account }) => {
            const resolvedAccountId = accountId ?? account.accountId ?? DEFAULT_ACCOUNT_ID;
            const useAccountPath = Boolean(cfg.channels?.yuanbao?.accounts?.[resolvedAccountId]);
            const basePath = useAccountPath ? `channels.yuanbao.accounts.${resolvedAccountId}.` : 'channels.yuanbao.';
            const policy = account.config.dm?.policy ?? 'open';
            const rawAllowFrom = (account.config.dm?.allowFrom ?? []).map(entry => String(entry));
            const allowFrom = policy === 'open' && rawAllowFrom.length === 0 ? ['*'] : rawAllowFrom;
            return {
                policy,
                allowFrom,
                policyPath: `${basePath}dm.policy`,
                allowFromPath: `${basePath}dm.allowFrom`,
                approveHint: formatPairingApproveHint('yuanbao'),
                normalizeEntry: raw => raw.trim().toLowerCase(),
            };
        },
    },
    groups: {
        resolveRequireMention: () => true,
    },
    threading: {
        resolveReplyToMode: () => 'first',
    },
    messaging: {
        normalizeTarget: normalizeYuanbaoMessagingTarget,
        targetResolver: {
            looksLikeId: raw => Boolean(raw.trim()),
            hint: '<userid> or group:<groupid>',
        },
    },
    outbound: {
        deliveryMode: 'direct',
        chunkerMode: 'text',
        textChunkLimit: 10000,
        sendText: async ({ account, target, text }) => {
            const wsClient = getActiveWsClient(account.accountId);
            if (!wsClient) {
                return { channel: 'yuanbao', ok: false, messageId: '', error: new Error(`WebSocket client not connected for account ${account.accountId}`) };
            }
            return toChannelResult(await sendTextToTarget(account, target, text, wsClient));
        },
        sendMedia: async ({ account, target, mediaUrl, text, mediaLocalRoots }) => {
            const wsClient = getActiveWsClient(account.accountId);
            if (!wsClient) {
                return { channel: 'yuanbao', ok: false, messageId: '', error: new Error(`WebSocket client not connected for account ${account.accountId}`) };
            }
            if (!mediaUrl) {
                return { channel: 'yuanbao', ok: true, messageId: '' };
            }
            try {
                const core = getYuanbaoRuntime();
                const uploadResult = await downloadAndUploadMedia(mediaUrl, core, account, mediaLocalRoots);
                const msgBody = buildMediaMsgBodyFromUpload(uploadResult);
                const { sendMsgBodyDirect } = await import('./message-handler/index.js');
                return toChannelResult(await sendMsgBodyDirect({ account, target, msgBody, wsClient }));
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                return sendMediaFallbackAsText(account, target, text, mediaUrl, errMsg);
            }
        },
    },
    status: {
        defaultRuntime: {
            accountId: DEFAULT_ACCOUNT_ID,
            running: false,
            lastStartAt: null,
            lastStopAt: null,
            lastError: null,
        },
        buildChannelSummary: ({ snapshot }) => ({
            configured: snapshot.configured ?? false,
            running: snapshot.running ?? false,
            lastStartAt: snapshot.lastStartAt ?? null,
            lastStopAt: snapshot.lastStopAt ?? null,
            lastError: snapshot.lastError ?? null,
            lastInboundAt: snapshot.lastInboundAt ?? null,
            lastOutboundAt: snapshot.lastOutboundAt ?? null,
            probe: snapshot.probe,
            lastProbeAt: snapshot.lastProbeAt ?? null,
        }),
        probeAccount: async () => ({ ok: true }),
        buildAccountSnapshot: ({ account, runtime }) => ({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: account.configured,
            running: runtime?.running ?? false,
            lastStartAt: runtime?.lastStartAt ?? null,
            lastStopAt: runtime?.lastStopAt ?? null,
            lastError: runtime?.lastError ?? null,
            lastInboundAt: runtime?.lastInboundAt ?? null,
            lastOutboundAt: runtime?.lastOutboundAt ?? null,
            dmPolicy: account.config.dm?.policy ?? 'open',
        }),
    },
    gateway: {
        startAccount: async (ctx) => {
            const { account } = ctx;
            ctx.log?.debug(`启动账号: ${account.accountId}, config=${JSON.stringify(account)}`);
            if (!account.configured) {
                ctx.log?.warn(`[${account.accountId}] yuanbao not configured; skipping`);
                ctx.setStatus({ accountId: account.accountId, running: false, configured: false });
                return;
            }
            ctx.log?.info(`[${account.accountId}] 使用 WebSocket 模式连接`);
            ctx.setStatus({
                accountId: account.accountId,
                running: true,
                configured: true,
                lastStartAt: Date.now(),
            });
            return startYuanbaoWsGateway({
                account,
                config: ctx.cfg,
                abortSignal: ctx.abortSignal,
                log: ctx.log,
                runtime: getYuanbaoRuntime(),
                statusSink: patch => ctx.setStatus({ accountId: ctx.accountId, ...patch }),
            });
        },
        stopAccount: async (ctx) => {
            ctx.setStatus({
                accountId: ctx.account.accountId,
                running: false,
                lastStopAt: Date.now(),
            });
        },
    },
};
//# sourceMappingURL=channel.js.map