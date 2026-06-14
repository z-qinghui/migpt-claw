import { MiNA } from './mina.js';
import { MIoT } from './miot.js';
import type { MiAccount } from './typing.js';
export declare function updateMiAccount(account: MiAccount): (updated: MiAccount) => void;
export declare function getMiService(config: {
    service: 'miot' | 'mina';
    userId?: string;
    password?: string;
    passToken?: string;
    did?: string;
    relogin?: boolean;
}): Promise<MiNA | MIoT | undefined>;
//# sourceMappingURL=common.d.ts.map