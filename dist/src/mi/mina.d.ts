import { MiAccount, MiNADevice, MiConversations } from './typing.js';

type MiNAAccount = MiAccount & {
    device: MiNADevice;
};
declare class MiNA {
    account: MiNAAccount;
    constructor(account: MiNAAccount);
    static getDevice(account: MiNAAccount): Promise<MiNAAccount>;
    private static __callMiNA;
    private _callMiNA;
    /**
     * 调用小爱音箱上的 ubus 服务
     */
    callUbus(scope: string, command: string, _message?: any): Promise<any>;
    /**
     * 获取设备列表
     */
    getDevices(): Promise<any>;
    /**
     * 获取设备播放状态
     */
    getStatus(): Promise<{
        volume: number;
        status: 'idle' | 'playing' | 'paused' | 'stopped' | 'unknown';
        media_type?: number;
        loop_type?: number;
    } | undefined>;
    /**
     * 获取音量
     */
    getVolume(): Promise<number | undefined>;
    /**
     * 设置音量
     */
    setVolume(_volume: number): Promise<boolean>;
    /**
     * 播放
     */
    play({ text, url, save }?: {
        text?: string;
        url?: string;
        save?: 0 | 1;
    }): Promise<boolean>;
    /**
     * 暂停播放
     */
    pause(): Promise<boolean>;
    /**
     * 播放或暂停
     */
    playOrPause(): Promise<boolean>;
    /**
     * 停止播放
     */
    stop(): Promise<boolean>;
    /**
     * 获取对话消息列表
     */
    getConversations(options?: {
        limit?: number;
        timestamp?: number;
    }): Promise<MiConversations | undefined>;
}

export { MiNA };
