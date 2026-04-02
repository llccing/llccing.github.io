import { createRequire } from 'module';
import os from 'os';
let _pluginVersion = '';
let _openclawVersion = '';
try {
    const _require = createRequire(import.meta.url);
    const _pluginPkg = _require('../../../package.json');
    const _openclawJson = _require('../../../../../openclaw.json');
    _pluginVersion = _pluginPkg.version;
    _openclawVersion = _openclawJson.meta.lastTouchedVersion;
}
catch (e) {
    console.error('get-env error', e);
}
export const getPluginVersion = () => _pluginVersion;
export const getOpenclawVersion = () => _openclawVersion;
export const getOperationSystem = () => os.type();
//# sourceMappingURL=get-env.js.map