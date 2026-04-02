/**
 * QQ Bot API 鉴权和请求封装
 * [修复版] 已重构为支持多实例并发，消除全局变量冲突
 */
export declare const PLUGIN_USER_AGENT: string;
/** 出站消息元信息（结构化存储，不做预格式化） */
export interface OutboundMeta {
    /** 消息文本内容 */
    text?: string;
    /** 媒体类型 */
    mediaType?: "image" | "voice" | "video" | "file";
    /** 媒体来源：在线 URL */
    mediaUrl?: string;
    /** 媒体来源：本地文件路径或文件名 */
    mediaLocalPath?: string;
    /** TTS 原文本（仅 voice 类型有效，用于保存 TTS 前的文本内容） */
    ttsText?: string;
}
type OnMessageSentCallback = (refIdx: string, meta: OutboundMeta) => void;
/**
 * 注册出站消息回调
 * 当消息发送成功且 QQ 返回 ref_idx 时，自动回调此函数
 * 用于在最底层统一缓存 bot 出站消息的 refIdx
 */
export declare function onMessageSent(callback: OnMessageSentCallback): void;
/**
 * 初始化 API 配置
 * @param options.markdownSupport - 是否支持 markdown 消息（默认 false，需要机器人具备该权限才能启用）
 */
export declare function initApiConfig(options: {
    markdownSupport?: boolean;
}): void;
/**
 * 获取当前是否支持 markdown
 */
export declare function isMarkdownSupport(): boolean;
/**
 * 获取 AccessToken（带缓存 + singleflight 并发安全）
 *
 * 使用 singleflight 模式：当多个请求同时发现 Token 过期时，
 * 只有第一个请求会真正去获取新 Token，其他请求复用同一个 Promise。
 *
 * 按 appId 隔离，支持多机器人并发请求。
 */
export declare function getAccessToken(appId: string, clientSecret: string): Promise<string>;
/**
 * 清除 Token 缓存
 * @param appId 选填。如果有，只清空特定账号的缓存；如果没有，清空所有账号。
 */
export declare function clearTokenCache(appId?: string): void;
/**
 * 获取 Token 缓存状态（用于监控）
 */
export declare function getTokenStatus(appId: string): {
    status: "valid" | "expired" | "refreshing" | "none";
    expiresAt: number | null;
};
/**
 * 获取全局唯一的消息序号（范围 0 ~ 65535）
 * 使用毫秒级时间戳低位 + 随机数异或混合，无状态，避免碰撞
 */
export declare function getNextMsgSeq(_msgId: string): number;
/**
 * API 请求封装
 */
export declare function apiRequest<T = unknown>(accessToken: string, method: string, path: string, body?: unknown, timeoutMs?: number): Promise<T>;
export declare function getGatewayUrl(accessToken: string): Promise<string>;
export interface MessageResponse {
    id: string;
    timestamp: number | string;
    /** 消息的引用索引信息（出站时由 QQ 服务端返回） */
    ext_info?: {
        ref_idx?: string;
    };
}
export declare function sendC2CMessage(accessToken: string, openid: string, content: string, msgId?: string, messageReference?: string): Promise<MessageResponse>;
export declare function sendC2CInputNotify(accessToken: string, openid: string, msgId?: string, inputSecond?: number): Promise<{
    refIdx?: string;
}>;
export declare function sendChannelMessage(accessToken: string, channelId: string, content: string, msgId?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendGroupMessage(accessToken: string, groupOpenid: string, content: string, msgId?: string): Promise<MessageResponse>;
export declare function sendProactiveC2CMessage(accessToken: string, openid: string, content: string): Promise<MessageResponse>;
export declare function sendProactiveGroupMessage(accessToken: string, groupOpenid: string, content: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare enum MediaFileType {
    IMAGE = 1,
    VIDEO = 2,
    VOICE = 3,
    FILE = 4
}
export interface UploadMediaResponse {
    file_uuid: string;
    file_info: string;
    ttl: number;
    id?: string;
}
export declare function uploadC2CMedia(accessToken: string, openid: string, fileType: MediaFileType, url?: string, fileData?: string, srvSendMsg?: boolean, fileName?: string): Promise<UploadMediaResponse>;
export declare function uploadGroupMedia(accessToken: string, groupOpenid: string, fileType: MediaFileType, url?: string, fileData?: string, srvSendMsg?: boolean, fileName?: string): Promise<UploadMediaResponse>;
export declare function sendC2CMediaMessage(accessToken: string, openid: string, fileInfo: string, msgId?: string, content?: string, meta?: OutboundMeta): Promise<MessageResponse>;
export declare function sendGroupMediaMessage(accessToken: string, groupOpenid: string, fileInfo: string, msgId?: string, content?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CImageMessage(accessToken: string, openid: string, imageUrl: string, msgId?: string, content?: string, localPath?: string): Promise<MessageResponse>;
export declare function sendGroupImageMessage(accessToken: string, groupOpenid: string, imageUrl: string, msgId?: string, content?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CVoiceMessage(accessToken: string, openid: string, voiceBase64?: string, voiceUrl?: string, msgId?: string, ttsText?: string, filePath?: string): Promise<MessageResponse>;
export declare function sendGroupVoiceMessage(accessToken: string, groupOpenid: string, voiceBase64?: string, voiceUrl?: string, msgId?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CFileMessage(accessToken: string, openid: string, fileBase64?: string, fileUrl?: string, msgId?: string, fileName?: string, localFilePath?: string): Promise<MessageResponse>;
export declare function sendGroupFileMessage(accessToken: string, groupOpenid: string, fileBase64?: string, fileUrl?: string, msgId?: string, fileName?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CVideoMessage(accessToken: string, openid: string, videoUrl?: string, videoBase64?: string, msgId?: string, content?: string, localPath?: string): Promise<MessageResponse>;
export declare function sendGroupVideoMessage(accessToken: string, groupOpenid: string, videoUrl?: string, videoBase64?: string, msgId?: string, content?: string): Promise<{
    id: string;
    timestamp: string;
}>;
interface BackgroundTokenRefreshOptions {
    refreshAheadMs?: number;
    randomOffsetMs?: number;
    minRefreshIntervalMs?: number;
    retryDelayMs?: number;
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
export declare function startBackgroundTokenRefresh(appId: string, clientSecret: string, options?: BackgroundTokenRefreshOptions): void;
/**
 * 停止后台 Token 刷新
 * @param appId 选填。如果有，仅停止该账号的定时刷新。
 */
export declare function stopBackgroundTokenRefresh(appId?: string): void;
export declare function isBackgroundTokenRefreshRunning(appId?: string): boolean;
export {};
