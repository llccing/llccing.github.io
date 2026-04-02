export declare function createLookupConversationMembersTool(ctx: any): {
    name: string;
    label: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
            };
        };
    };
    execute(_toolCallId: string, params: Record<string, unknown>): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
};
//# sourceMappingURL=lookup-conversation-members.d.ts.map