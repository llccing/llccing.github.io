import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from 'openclaw/plugin-sdk';
import { logSimple } from './logger.js';
const DEFAULT_API_DOMAIN = 'bot.yuanbao.tencent.com';
const DEFAULT_WS_GATEWAY_URL = 'wss://bot-wss.yuanbao.tencent.com/wss/connection';
function listConfiguredAccountIds(cfg) {
    const accounts = cfg.channels?.yuanbao?.accounts;
    if (!accounts || typeof accounts !== 'object')
        return [];
    return Object.keys(accounts).filter(Boolean);
}
export function listYuanbaoAccountIds(cfg) {
    const ids = listConfiguredAccountIds(cfg);
    if (ids.length === 0)
        return [DEFAULT_ACCOUNT_ID];
    return ids.sort((a, b) => a.localeCompare(b));
}
export function resolveDefaultYuanbaoAccountId(cfg) {
    const yuanbaoConfig = cfg.channels?.yuanbao;
    if (yuanbaoConfig?.defaultAccount?.trim())
        return yuanbaoConfig.defaultAccount.trim();
    const ids = listYuanbaoAccountIds(cfg);
    if (ids.includes(DEFAULT_ACCOUNT_ID))
        return DEFAULT_ACCOUNT_ID;
    return ids[0] ?? DEFAULT_ACCOUNT_ID;
}
function resolveAccountConfig(cfg, accountId) {
    const accounts = cfg.channels?.yuanbao?.accounts;
    if (!accounts || typeof accounts !== 'object')
        return undefined;
    return accounts[accountId];
}
function mergeYuanbaoAccountConfig(cfg, accountId) {
    const raw = (cfg.channels?.yuanbao ?? {});
    const { accounts: _accounts, defaultAccount: _defaultAccount, ...base } = raw;
    const account = resolveAccountConfig(cfg, accountId) ?? {};
    const merged = { ...base, ...account };
    return merged;
}
function resolveOverflowPolicy(raw) {
    return raw === 'split' ? 'split' : 'stop';
}
function warnIncompleteConfig(appKey, appSecret) {
    const missing = [];
    if (!appKey)
        missing.push('appKey');
    if (!appSecret)
        missing.push('appSecret');
    if (missing.length > 0) {
        logSimple('warn', `配置不完整，缺少: ${missing.join(', ')}`);
    }
}
export function resolveYuanbaoAccount(params) {
    const accountId = normalizeAccountId(params.accountId);
    const yuanbaoConfig = params.cfg.channels?.yuanbao;
    const baseEnabled = yuanbaoConfig?.enabled !== false;
    const merged = mergeYuanbaoAccountConfig(params.cfg, accountId);
    const enabled = baseEnabled && merged.enabled !== false;
    const appKey = merged.appKey?.trim() || undefined;
    const appSecret = merged.appSecret?.trim() || undefined;
    const identifier = merged.identifier?.trim() || undefined;
    const apiDomain = merged.apiDomain?.trim() || DEFAULT_API_DOMAIN;
    const token = merged.token?.trim() || undefined;
    const overflowPolicy = resolveOverflowPolicy(merged.overflowPolicy);
    const wsGatewayUrl = merged.wsUrl?.trim() || DEFAULT_WS_GATEWAY_URL;
    const wsHeartbeatInterval = undefined;
    const wsMaxReconnectAttempts = 100;
    const mediaMaxMb = merged.mediaMaxMb && merged.mediaMaxMb >= 1 ? merged.mediaMaxMb : 20;
    const historyLimit = merged.historyLimit !== undefined && merged.historyLimit >= 0
        ? merged.historyLimit
        : 100;
    const configured = Boolean(appKey && appSecret);
    if (!configured && Boolean(yuanbaoConfig)) {
        warnIncompleteConfig(appKey, appSecret);
    }
    return {
        accountId,
        name: merged.name?.trim() || undefined,
        enabled,
        configured,
        appKey,
        appSecret,
        identifier,
        botId: undefined,
        apiDomain,
        token,
        wsGatewayUrl,
        wsHeartbeatInterval,
        wsMaxReconnectAttempts,
        overflowPolicy,
        mediaMaxMb,
        historyLimit,
        config: merged,
    };
}
export function listEnabledYuanbaoAccounts(cfg) {
    return listYuanbaoAccountIds(cfg)
        .map(accountId => resolveYuanbaoAccount({ cfg, accountId }))
        .filter(account => account.enabled);
}
//# sourceMappingURL=accounts.js.map