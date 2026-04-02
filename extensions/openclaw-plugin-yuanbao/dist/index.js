import { emptyPluginConfigSchema } from 'openclaw/plugin-sdk';
import { setYuanbaoRuntime } from './src/runtime.js';
import { yuanbaoPlugin } from './src/channel.js';
import { initLogger } from './src/logger.js';
import { createLookupConversationMembersTool } from './src/tools/index.js';
import pluginManifest from './openclaw.plugin.json' with { type: 'json' };
const plugin = {
    id: pluginManifest.id,
    name: pluginManifest.name,
    description: pluginManifest.description,
    configSchema: emptyPluginConfigSchema(),
    register(api) {
        initLogger(api);
        setYuanbaoRuntime(api.runtime);
        api.registerChannel({ plugin: yuanbaoPlugin });
        api.registerTool(createLookupConversationMembersTool, { optional: false });
    },
};
export default plugin;
//# sourceMappingURL=index.js.map