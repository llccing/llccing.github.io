export type UserRecord = {
    senderId: string;
    senderName: string;
    lastSeen: number;
};
export declare function getConversationKey(accountId: string, chatType: 'c2c' | 'group', peerId: string): string;
export declare function recordUser(conversationKey: string, senderId: string, senderName: string): void;
export declare function lookupUsers(conversationKey: string, nameFilter?: string): UserRecord[];
export declare function listConversationKeys(): string[];
//# sourceMappingURL=user-tracker.d.ts.map