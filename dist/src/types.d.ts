export type { MiGPTConfig, MiGPTAccountConfig, ResolvedMiAccount, ExtendedOpenClawConfig, } from './config.js';
export interface IMessage {
    id: string;
    sender: 'user';
    text: string;
    timestamp: number;
    deviceId: string;
}
export interface MiDevice {
    did: string;
    name: string;
    model?: string;
    mac?: string;
}
export interface MiMessageEvent {
    channel: 'migpt';
    accountId: string;
    from: string;
    fromName: string;
    text: string;
    timestamp: number;
}
//# sourceMappingURL=types.d.ts.map