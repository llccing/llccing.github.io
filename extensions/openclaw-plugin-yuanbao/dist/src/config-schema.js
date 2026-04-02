export const yuanbaoConfigSchema = {
    schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
            appKey: { type: 'string' },
            appSecret: { type: 'string' },
            identifier: { type: 'string' },
            apiDomain: { type: 'string' },
            overflowPolicy: { type: 'string', enum: ['stop', 'split'] },
            mediaMaxMb: { type: 'number', minimum: 1 },
            historyLimit: { type: 'number', minimum: 0 },
        },
        additionalProperties: false,
    },
};
//# sourceMappingURL=config-schema.js.map