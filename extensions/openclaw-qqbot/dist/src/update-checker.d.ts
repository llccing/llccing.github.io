/**
 * 后台版本检查器
 *
 * - triggerUpdateCheck(): gateway 启动时调用，后台检查 npm registry 是否有新版本
 * - getUpdateInfo(): 返回上次检查结果（供 /bot-version、/bot-help 指令使用）
 *
 * 使用 HTTPS 直接请求 npm registry API（不依赖 npm CLI），
 * 支持多 registry fallback：npmjs.org → npmmirror.com，解决国内网络问题。
 */
export interface UpdateInfo {
    current: string;
    latest: string | null;
    hasUpdate: boolean;
    checkedAt: number;
    error?: string;
}
export declare function triggerUpdateCheck(log?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug?: (msg: string) => void;
}): void;
export declare function getUpdateInfo(): UpdateInfo;
