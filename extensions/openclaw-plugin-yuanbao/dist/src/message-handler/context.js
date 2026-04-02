import { LOG_PREFIX } from '../logger.js';
export const YUANBAO_FINAL_TEXT_CHUNK_LIMIT = 3500;
export const YUANBAO_OVERFLOW_NOTICE_TEXT = '内容较长，已停止发送剩余内容。';
export const REPLY_TIMEOUT_MS = 5 * 60 * 1000;
export function ctxLog(ctx, level, message) {
    const full = `${LOG_PREFIX} ${message}`;
    if (level === 'error') {
        ctx.log.error(full);
    }
    else if (level === 'warn') {
        ctx.log.warn(full);
    }
    else {
        ctx.log.info(full);
    }
}
export function ctxVerbose(ctx, message) {
    ctx.log.verbose(`${LOG_PREFIX} ${message}`);
}
export function resolveOutboundSenderAccount(account) {
    return account.botId || account.identifier || undefined;
}
export function splitTextByFixedLength(text, limit) {
    if (!text) {
        return [];
    }
    if (limit <= 0 || text.length <= limit) {
        return [text];
    }
    const chunks = [];
    for (let index = 0; index < text.length; index += limit) {
        chunks.push(text.slice(index, index + limit));
    }
    return chunks;
}
export function splitTextByUtf8ByteLength(text, byteLimit) {
    if (!text) {
        return [];
    }
    const encoder = new TextEncoder();
    if (byteLimit <= 0 || encoder.encode(text).byteLength <= byteLimit) {
        return [text];
    }
    const chunks = [];
    let current = '';
    let currentBytes = 0;
    for (const char of text) {
        const charBytes = encoder.encode(char).byteLength;
        if (currentBytes + charBytes > byteLimit) {
            if (current)
                chunks.push(current);
            current = char;
            currentBytes = charBytes;
        }
        else {
            current += char;
            currentBytes += charBytes;
        }
    }
    if (current)
        chunks.push(current);
    return chunks;
}
const SLASH_HEALTH_CHECK_RE = /^\/yuanbao-health-check(?:\s+(\d{1,2}:\d{2})(?:\s+(\d{1,2}:\d{2}))?)?\s*$/;
export function rewriteSlashCommand(text, onRewrite) {
    const trimmed = text.trim();
    const match = SLASH_HEALTH_CHECK_RE.exec(trimmed);
    if (!match)
        return text;
    const startTime = match[1];
    const endTime = match[2];
    const result = (startTime && endTime)
        ? `查询 openclaw 系统 [yuanbao channel] 从${startTime}到${endTime}时间段内的 warn 和 error 日志`
        : '查询 openclaw 系统 [yuanbao channel] 过去10分钟内的 warn 和 error 日志';
    const prompt = `
    ${result}

    **要求**：
    - 不要输出你的思考过程
    - 只列出日志摘要，不用分析代码层面的问题。
    - 输出格式为纯文本，不要任何 Markdown 语法。
    - 每条日志摘要占一行，行首不需要任何符号。
  `;
    onRewrite?.(text, prompt);
    return prompt;
}
//# sourceMappingURL=context.js.map