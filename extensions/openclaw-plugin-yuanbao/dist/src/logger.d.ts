import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
export declare const LOG_PREFIX: string;
export interface PluginLogger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
export declare function initLogger(api: OpenClawPluginApi): void;
export declare const logger: PluginLogger;
export declare function isVerbose(): boolean;
export declare function sanitize(value: unknown): string;
export declare function logSimple(level: 'info' | 'warn' | 'error', message: string): void;
export declare function logDebug(message: string): void;
//# sourceMappingURL=logger.d.ts.map