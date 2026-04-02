export function parseQuoteFromCloudCustomData(cloudCustomData) {
    if (!cloudCustomData)
        return undefined;
    try {
        const parsed = JSON.parse(cloudCustomData);
        if (!parsed.quote || typeof parsed.quote !== 'object')
            return undefined;
        const { quote } = parsed;
        if (!quote.desc?.trim())
            return undefined;
        return quote;
    }
    catch {
        return undefined;
    }
}
const QUOTE_DESC_MAX_LENGTH = 500;
export function formatQuoteContext(quote) {
    let senderPart = '';
    if (quote.sender_nickname) {
        senderPart = ` from ${quote.sender_nickname}`;
    }
    else if (quote.sender_id) {
        senderPart = ` from ${quote.sender_id}`;
    }
    let desc = quote.desc?.trim() || '';
    if (desc.length > QUOTE_DESC_MAX_LENGTH) {
        desc = `${desc.slice(0, QUOTE_DESC_MAX_LENGTH)}...(truncated)`;
    }
    return `> [Quoted message${senderPart}]:\n>${desc}\n`;
}
//# sourceMappingURL=quote.js.map