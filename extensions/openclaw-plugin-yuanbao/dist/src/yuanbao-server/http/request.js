import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { LOG_PREFIX, sanitize } from '../../logger.js';
import { getOpenclawVersion, getOperationSystem, getPluginVersion } from '../../utils/get-env.js';
export const SIGN_TOKEN_PATH = '/api/v5/robotLogic/sign-token';
export const UPLOAD_INFO_PATH = '/api/resource/genUploadInfo';
export const DOWNLOAD_INFO_PATH = '/api/resource/v1/download';
const RETRYABLE_SIGN_CODE = 10099;
const SIGN_MAX_RETRIES = 3;
const SIGN_RETRY_DELAY_MS = 1000;
const CACHE_TTL_MS = 20 * 24 * 60 * 60 * 1000;
const tokenCacheMap = new Map();
const tokenFetchPromises = new Map();
export function clearSignTokenCache(accountId) {
    tokenCacheMap.delete(accountId);
}
export function clearAllSignTokenCache() {
    tokenCacheMap.clear();
}
export function getTokenStatus(accountId) {
    if (tokenFetchPromises.has(accountId)) {
        return { status: 'refreshing', expiresAt: tokenCacheMap.get(accountId)?.expiresAt ?? null };
    }
    const cached = tokenCacheMap.get(accountId);
    if (!cached)
        return { status: 'none', expiresAt: null };
    return {
        status: cached.expiresAt > Date.now() ? 'valid' : 'expired',
        expiresAt: cached.expiresAt,
    };
}
function computeSignature(params) {
    const plain = params.nonce + params.timestamp + params.appKey + params.appSecret;
    return createHmac('sha256', params.appSecret).update(plain)
        .digest('hex');
}
export function verifySignature(expected, actual) {
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(actual, 'hex');
    if (expectedBuf.length !== actualBuf.length) {
        return false;
    }
    return timingSafeEqual(expectedBuf, actualBuf);
}
async function doFetchSignToken(account, log) {
    const { appKey, appSecret, apiDomain } = account;
    if (!appKey || !appSecret)
        throw new Error('签票失败: 缺少 appKey 或 appSecret');
    const url = `https://${apiDomain}${SIGN_TOKEN_PATH}`;
    for (let attempt = 0; attempt <= SIGN_MAX_RETRIES; attempt++) {
        const nonce = randomBytes(16).toString('hex');
        const bjTime = new Date(Date.now() + 8 * 3600000);
        const timestamp = bjTime.toISOString().replace('Z', '+08:00')
            .replace(/\.\d{3}/, '');
        const signature = computeSignature({ nonce, timestamp, appKey, appSecret });
        const body = { app_key: appKey, nonce, signature, timestamp };
        log?.info?.(`${LOG_PREFIX}[${account.accountId}] 正在签票: url=${url}${attempt > 0 ? ` (重试 ${attempt}/${SIGN_MAX_RETRIES})` : ''}`);
        log?.info?.(`${LOG_PREFIX}[${account.accountId}] 签票入参: ${sanitize(body)}`);
        const headers = {
            'Content-Type': 'application/json',
            'X-AppVersion': getPluginVersion(),
            'X-OperationSystem': getOperationSystem(),
            'X-Instance-Id': '16',
            'X-Bot-Version': getOpenclawVersion(),
        };
        if (account.config?.routeEnv) {
            headers['x-route-env'] = account.config.routeEnv;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`签票请求失败: HTTP ${response.status} ${response.statusText}`);
        }
        const result = (await response.json());
        if (result.code === 0) {
            log?.info?.(`${LOG_PREFIX}[${account.accountId}] 签票成功: bot_id=${result.data.bot_id}`);
            return result.data;
        }
        if (result.code === RETRYABLE_SIGN_CODE && attempt < SIGN_MAX_RETRIES) {
            log?.warn?.(`${LOG_PREFIX}[${account.accountId}] 签票可重试: code=${result.code}, 将在 ${SIGN_RETRY_DELAY_MS}ms 后重试`);
            await new Promise(r => setTimeout(r, SIGN_RETRY_DELAY_MS));
            continue;
        }
        throw new Error(`签票错误: code=${result.code}, msg=${result.msg}`);
    }
    throw new Error('签票失败: 超过最大重试次数');
}
export async function getSignToken(account, log) {
    if (account.token) {
        return {
            bot_id: account.botId || account.identifier || '',
            duration: CACHE_TTL_MS / 1000,
            product: 'yuanbao',
            source: 'bot',
            token: account.token,
        };
    }
    const cached = tokenCacheMap.get(account.accountId);
    if (cached && cached.expiresAt > Date.now()) {
        log?.info?.(`${LOG_PREFIX}[${account.accountId}] 使用缓存 token (剩余 ${Math.round((cached.expiresAt - Date.now()) / 86400000)} 天)`);
        return cached.data;
    }
    let fetchPromise = tokenFetchPromises.get(account.accountId);
    if (fetchPromise) {
        log?.info?.(`${LOG_PREFIX}[${account.accountId}] 签票进行中，等待已有请求`);
        return fetchPromise;
    }
    fetchPromise = (async () => {
        try {
            const data = await doFetchSignToken(account, log);
            tokenCacheMap.set(account.accountId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
            return data;
        }
        finally {
            tokenFetchPromises.delete(account.accountId);
        }
    })();
    tokenFetchPromises.set(account.accountId, fetchPromise);
    return fetchPromise;
}
export async function getAuthHeaders(account, log) {
    const data = await getSignToken(account, log);
    if (data.bot_id && !account.botId) {
        account.botId = data.bot_id;
    }
    const authHeaders = {
        'X-ID': data.bot_id || account.botId || account.identifier || '',
        'X-Token': data.token,
        'X-Source': data.source || 'web',
        'X-AppVersion': getPluginVersion(),
        'X-OperationSystem': getOperationSystem(),
        'X-Instance-Id': '16',
        'X-Bot-Version': getOpenclawVersion(),
    };
    if (account.config?.routeEnv) {
        authHeaders['X-Route-Env'] = account.config.routeEnv;
    }
    return authHeaders;
}
export async function yuanbaoPost(account, path, body, log) {
    const url = `https://${account.apiDomain}${path}`;
    const authHeaders = await getAuthHeaders(account, log);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`[yuanbao-api] ${path} HTTP ${response.status} ${response.statusText}`);
    }
    const json = (await response.json());
    if (json.code !== 0 && json.code !== undefined) {
        throw new Error(`[yuanbao-api] ${path} 错误: code=${json.code}, msg=${json.msg}`);
    }
    log?.info?.(`${LOG_PREFIX} [${account.accountId}] ${path} 响应: ${sanitize(json)}`);
    return (json.data ?? json);
}
export async function yuanbaoGet(account, path, params, log) {
    const url = `https://${account.apiDomain}${path}${params ? `?${new URLSearchParams(params).toString()}` : ''}`;
    const authHeaders = await getAuthHeaders(account, log);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
    });
    if (!response.ok) {
        throw new Error(`[yuanbao-api] ${path} HTTP ${response.status} ${response.statusText}`);
    }
    const json = (await response.json());
    if (json.code !== 0 && json.code !== undefined) {
        throw new Error(`[yuanbao-api] ${path} 错误: code=${json.code}, msg=${json.msg}`);
    }
    return (json.data ?? json);
}
//# sourceMappingURL=request.js.map