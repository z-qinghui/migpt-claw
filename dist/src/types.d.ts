export { ExtendedOpenClawConfig, MiGPTAccountConfig, MiGPTConfig, ResolvedMiAccount } from './config.js';
import 'openclaw/plugin-sdk';
import './service.js';
import './mi/mina.js';
import './mi/typing.js';
import './mi/miot.js';

interface IMessage {
    id: string;
    sender: 'user';
    text: string;
    timestamp: number;
    deviceId: string;
}
interface MiDevice {
    did: string;
    name: string;
    model?: string;
    mac?: string;
}
interface MiMessageEvent {
    channel: 'migpt';
    accountId: string;
    from: string;
    fromName: string;
    text: string;
    timestamp: number;
}

export type { IMessage, MiDevice, MiMessageEvent };
