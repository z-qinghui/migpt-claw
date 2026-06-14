import { MiNA } from './mina.js';
import { MIoT } from './miot.js';
import { MiAccount } from './typing.js';

declare function updateMiAccount(account: MiAccount): (updated: MiAccount) => void;
declare function getMiService(config: {
    service: 'miot' | 'mina';
    userId?: string;
    password?: string;
    passToken?: string;
    did?: string;
    relogin?: boolean;
}): Promise<MiNA | MIoT | undefined>;

export { getMiService, updateMiAccount };
