import { PluginRuntime } from 'openclaw/plugin-sdk';

declare function setMiGPTRuntime(next: PluginRuntime): void;
declare function getMiGPTRuntime(): PluginRuntime;

export { getMiGPTRuntime, setMiGPTRuntime };
