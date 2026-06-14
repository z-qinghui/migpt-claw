import { OpenClawPluginApi } from 'openclaw/plugin-sdk';
export { miGPTPlugin } from './src/channel.js';
export { getMiGPTRuntime, setMiGPTRuntime } from './src/runtime.js';
export { miGPTOnboardingAdapter } from './src/onboarding.js';
export { MiService, MiServiceConfig } from './src/service.js';
export { IMessage, MiMessage } from './src/message.js';
export { MiSpeaker } from './src/speaker.js';
export { ExtendedOpenClawConfig, MiGPTAccountConfig, MiGPTConfig, ResolvedMiAccount, applyMiAccountConfig, deleteMiAccount, formatMiAllowFrom, listMiAccountIds, resolveDefaultMiAccountId, resolveMiAccount, resolveMiAllowFrom, setMiAccountEnabled } from './src/config.js';
export { MiDevice, MiMessageEvent } from './src/types.js';
import './src/mi/mina.js';
import './src/mi/typing.js';
import './src/mi/miot.js';
import './src/tts/mimo.js';

declare const plugin: {
    id: string;
    name: string;
    description: string;
    configSchema: any;
    register(api: OpenClawPluginApi): void;
};

export { plugin as default };
