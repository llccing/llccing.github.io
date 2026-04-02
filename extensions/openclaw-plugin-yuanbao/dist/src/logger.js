import { getPluginVersion } from './utils/get-env.js';
export const LOG_PREFIX = `[yuanbao:${getPluginVersion()}]`;
let childLogger = null;
let initialized = false;
let verboseEnabled = false;
const fallbackLogger = {
    info(message, meta) {
        console.log(`${LOG_PREFIX} ${message}`, meta ?? '');
    },
    warn(message, meta) {
        console.warn(`${LOG_PREFIX} ${message}`, meta ?? '');
    },
    error(message, meta) {
        console.error(`${LOG_PREFIX} ${message}`, meta ?? '');
    },
    debug(message, meta) {
        console.debug(`${LOG_PREFIX} ${message}`, meta ?? '');
    },
};
export function initLogger(api) {
    try {
        childLogger = api.runtime.logging.getChildLogger({ plugin: 'yuanbao' });
        verboseEnabled = api.runtime.logging.shouldLogVerbose?.() ?? false;
        initialized = true;
    }
    catch (err) {
        console.error(`${LOG_PREFIX} 初始化 logger 失败，降级使用 console`, err);
    }
}
function getActiveLogger() {
    if (initialized && childLogger) {
        return {
            info: (message, meta) => (meta ? childLogger.info(message, meta) : childLogger.info(message)),
            warn: (message, meta) => (meta ? childLogger.warn(message, meta) : childLogger.warn(message)),
            error: (message, meta) => (meta ? childLogger.error(message, meta) : childLogger.error(message)),
            debug: (message, meta) => (meta ? childLogger.debug?.(message, meta) : childLogger.debug?.(message)),
        };
    }
    return fallbackLogger;
}
export const logger = {
    info(message, meta) {
        getActiveLogger().info(message, meta);
    },
    warn(message, meta) {
        getActiveLogger().warn(message, meta);
    },
    error(message, meta) {
        getActiveLogger().error(message, meta);
    },
    debug(message, meta) {
        getActiveLogger().debug(message, meta);
    },
};
export function isVerbose() {
    return verboseEnabled;
}
const OMIT_KEYS = new Set(['msg_body']);
const SENSITIVE_KEYS = new Set([
    'token',
    'signature',
    'app_key',
    'appkey',
    'appsecret',
    'app_secret',
    'secret',
    'password',
    'x-token',
]);
function maskValue(value) {
    if (value.length < 8)
        return '***';
    return `${value.slice(0, 3)}****${value.slice(-3)}`;
}
export function sanitize(value) {
    if (value === null || value === undefined)
        return String(value);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && parsed !== null) {
                return JSON.stringify(sanitizeObj(parsed));
            }
        }
        catch {
        }
        return value;
    }
    if (typeof value === 'object') {
        return JSON.stringify(sanitizeObj(value));
    }
    return String(value);
}
function sanitizeObj(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => (typeof item === 'object' && item !== null
            ? sanitizeObj(item)
            : item));
    }
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        if (OMIT_KEYS.has(key.toLowerCase()))
            continue;
        if (SENSITIVE_KEYS.has(key.toLowerCase()) && typeof val === 'string') {
            result[key] = maskValue(val);
        }
        else if (typeof val === 'object' && val !== null) {
            result[key] = sanitizeObj(val);
        }
        else {
            result[key] = val;
        }
    }
    return result;
}
export function logSimple(level, message) {
    logger[level](message);
}
export function logDebug(message) {
    logger.debug(message);
}
//# sourceMappingURL=logger.js.map