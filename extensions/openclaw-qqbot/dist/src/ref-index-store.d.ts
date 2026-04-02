/**
 * QQ Bot 引用索引持久化存储
 *
 * QQ Bot 使用 REFIDX_xxx 索引体系做引用消息，
 * 入站事件只有索引值，无 API 可回查内容。
 * 采用 内存缓存 + JSONL 追加写持久化 方案，确保重启后历史引用仍可命中。
 *
 * 存储位置：~/.openclaw/qqbot/data/ref-index.jsonl
 *
 * 每行格式：{"k":"REFIDX_xxx","v":{...},"t":1709000000}
 * - k = refIdx 键
 * - v = 消息数据
 * - t = 写入时间（用于 TTL 淘汰和 compact）
 */
export interface RefIndexEntry {
    /** 消息文本内容（完整保存） */
    content: string;
    /** 发送者 ID */
    senderId: string;
    /** 发送者名称 */
    senderName?: string;
    /** 消息时间戳 (ms) */
    timestamp: number;
    /** 是否是 bot 发出的消息 */
    isBot?: boolean;
    /** 附件摘要（图片/语音/视频/文件等） */
    attachments?: RefAttachmentSummary[];
}
/** 附件摘要：存本地路径、在线 URL 和类型描述 */
export interface RefAttachmentSummary {
    /** 附件类型 */
    type: "image" | "voice" | "video" | "file" | "unknown";
    /** 文件名（如有） */
    filename?: string;
    /** MIME 类型 */
    contentType?: string;
    /** 语音转录文本（入站：STT/ASR识别结果；出站：TTS原文本） */
    transcript?: string;
    /** 语音转录来源：stt=本地STT、asr=平台ASR、tts=TTS原文本、fallback=兜底文案 */
    transcriptSource?: "stt" | "asr" | "tts" | "fallback";
    /** 已下载到本地的文件路径（持久化后可供引用时访问） */
    localPath?: string;
    /** 在线来源 URL（公网图片/文件等） */
    url?: string;
}
/**
 * 存储一条消息的 refIdx 映射
 */
export declare function setRefIndex(refIdx: string, entry: RefIndexEntry): void;
/**
 * 查找被引用消息
 */
export declare function getRefIndex(refIdx: string): RefIndexEntry | null;
/**
 * 将引用消息内容格式化为人类可读的描述（供 AI 上下文注入）
 */
export declare function formatRefEntryForAgent(entry: RefIndexEntry): string;
/**
 * 进程退出前强制 compact（确保数据一致性）
 */
export declare function flushRefIndex(): void;
/**
 * 缓存统计（调试用）
 */
export declare function getRefIndexStats(): {
    size: number;
    maxEntries: number;
    totalLinesOnDisk: number;
    filePath: string;
};
