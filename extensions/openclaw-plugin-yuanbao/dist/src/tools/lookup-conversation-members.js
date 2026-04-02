import { lookupUsers, listConversationKeys } from '../user-tracker.js';
const MENTION_HINT = '\n\nTo @mention a user, include [mention](<senderId>:<senderName>) in your response.';
function resolveConversationKey(sessionKey, chatType) {
    const parts = sessionKey.split(':');
    if (parts.length < 4)
        return '';
    const tail = parts.slice(3).join(':');
    const allKeys = listConversationKeys();
    if (chatType === 'group') {
        return (allKeys.find(k => k.includes(`:group:${tail}`))
            || allKeys.find(k => k.endsWith(`:group:${tail}`))
            || '');
    }
    return allKeys.find(k => k.includes(`:c2c:${tail}`)) || '';
}
function formatResults(records) {
    return records.map(u => ({
        senderId: u.senderId,
        senderName: u.senderName,
        lastSeen: new Date(u.lastSeen).toISOString(),
    }));
}
function textContent(text) {
    return { content: [{ type: 'text', text }] };
}
function globalLookup(nameFilter) {
    const allKeys = listConversationKeys();
    const seen = new Set();
    const allResults = [];
    for (const key of allKeys) {
        for (const u of lookupUsers(key, nameFilter)) {
            if (!seen.has(u.senderId)) {
                seen.add(u.senderId);
                allResults.push(u);
            }
        }
    }
    if (allResults.length === 0) {
        return textContent(nameFilter
            ? `No participants found matching "${nameFilter}".`
            : 'No conversation participants recorded yet.');
    }
    return textContent(JSON.stringify(formatResults(allResults), null, 2) + MENTION_HINT);
}
export function createLookupConversationMembersTool(ctx) {
    const sessionKey = ctx.sessionKey ?? '';
    const chatType = ctx.chatType ?? '';
    return {
        name: 'lookup_conversation_members',
        label: 'Lookup Conversation Members',
        description: 'Look up users who have recently participated in the current conversation. '
            + 'Returns user IDs and names. Use this when the user asks you to @mention someone, '
            + 'or when you need to find a user\'s ID based on their name. '
            + 'After finding the user ID, output [mention](<senderId>:<senderName>) in your reply to @mention them.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Filter by user name (partial match, case-insensitive). '
                        + 'Leave empty to return all recent participants.',
                },
            },
        },
        async execute(_toolCallId, params) {
            const nameFilter = typeof params.name === 'string' ? params.name.trim() : '';
            const conversationKey = resolveConversationKey(sessionKey, chatType);
            if (!conversationKey) {
                return globalLookup(nameFilter);
            }
            const results = lookupUsers(conversationKey, nameFilter);
            if (results.length === 0) {
                return textContent(nameFilter
                    ? `No participants found matching "${nameFilter}".`
                    : 'No conversation participants recorded yet.');
            }
            return textContent(JSON.stringify(formatResults(results), null, 2) + MENTION_HINT);
        },
    };
}
//# sourceMappingURL=lookup-conversation-members.js.map