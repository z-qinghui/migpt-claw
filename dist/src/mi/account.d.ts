import { MiAccount } from './typing.js';

declare function getAccount(_account: MiAccount): Promise<MiAccount | undefined>;

export { getAccount };
