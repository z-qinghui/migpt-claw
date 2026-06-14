import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
declare const plugin: {
    id: string;
    name: string;
    description: string;
    configSchema: any;
    register(api: OpenClawPluginApi): void;
};
export default plugin;
export { miGPTPlugin } from './src/channel.js';
export { setMiGPTRuntime, getMiGPTRuntime } from './src/runtime.js';
export { miGPTOnboardingAdapter } from './src/onboarding.js';
export { MiService, type MiServiceConfig } from './src/service.js';
export { MiMessage, type IMessage } from './src/message.js';
export { MiSpeaker } from './src/speaker.js';
export * from './src/config.js';
export * from './src/types.js';
//# sourceMappingURL=index.d.ts.map