import { ChannelPlugin } from 'openclaw/plugin-sdk';
import { ResolvedMiAccount } from './config.js';
import './service.js';
import './mi/mina.js';
import './mi/typing.js';
import './mi/miot.js';

declare const miGPTPlugin: ChannelPlugin<ResolvedMiAccount>;

export { miGPTPlugin };
