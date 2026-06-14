import { MiAccount, MIoTDevice } from './typing.js';

type MIoTAccount = MiAccount & {
    device: MIoTDevice;
};
declare class MIoT {
    account: MIoTAccount;
    constructor(account: MIoTAccount);
    static getDevice(account: MIoTAccount): Promise<MIoTAccount>;
    private static __callMIoT;
    private _callMIoT;
    /**
     * 获取 MIoT 设备列表
     */
    getDevices(getVirtualModel?: boolean, getHuamiDevices?: number): Promise<any>;
    /**
     * 获取 MIoT 设备属性值
     */
    getProperty(scope: number, property: number): Promise<any>;
    /**
     * 设置 MIoT 设备属性值
     */
    setProperty(scope: number, property: number, value: any): Promise<boolean>;
    /**
     * 调用 MIoT 设备能力指令
     */
    doAction(scope: number, action: number, args?: any): Promise<boolean>;
    /**
     * 调用 MIoT 设备 RPC 指令
     */
    rpc(method: string, params: any, id?: number): Promise<any>;
    private _callMIoTSpec;
}

export { MIoT };
