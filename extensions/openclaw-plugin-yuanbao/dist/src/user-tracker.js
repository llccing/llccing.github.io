import { logger } from './logger.js';
const conversationUsers = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;
function cleanExpired() {
    const now = Date.now();
    for (const [convKey, users] of conversationUsers) {
        for (const [id, record] of users) {
            if (now - record.lastSeen > TTL_MS) {
                users.delete(id);
            }
        }
        if (users.size === 0) {
            conversationUsers.delete(convKey);
        }
    }
}
export function getConversationKey(accountId, chatType, peerId) {
    return `${accountId}:${chatType}:${peerId}`;
}
export function recordUser(conversationKey, senderId, senderName) {
    if (!senderId)
        return;
    if (!conversationUsers.has(conversationKey)) {
        conversationUsers.set(conversationKey, new Map());
    }
    const users = conversationUsers.get(conversationKey);
    users.set(senderId, {
        senderId,
        senderName: senderName || 'unknown',
        lastSeen: Date.now(),
    });
    cleanExpired();
    logger.debug?.(`[user-tracker] recorded user: ${senderName ?? '?'} (${senderId}) in ${conversationKey}`);
}
export function lookupUsers(conversationKey, nameFilter) {
    const users = conversationUsers.get(conversationKey);
    if (!users || users.size === 0)
        return [];
    let results = Array.from(users.values());
    if (nameFilter) {
        const filter = nameFilter.trim().toLowerCase();
        results = results.filter(u => u.senderName.toLowerCase().includes(filter));
    }
    results.sort((a, b) => b.lastSeen - a.lastSeen);
    return results;
}
export function listConversationKeys() {
    return Array.from(conversationUsers.keys());
}
//# sourceMappingURL=user-tracker.js.map