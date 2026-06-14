import { MiNA } from './mi/mina.js';
import { MIoT } from './mi/miot.js';
import './mi/typing.js';

interface MiServiceConfig {
    /** 小米 ID（数字） */
    userId?: string;
    /** 密码 */
    password?: string;
    /** 登录凭证 */
    passToken?: string;
    /** 是否开启调试模式 */
    debug?: boolean;
    /** 网络请求超时时长（毫秒） */
    timeout?: number;
    /** 音箱控制方式：mina/miot */
    speakerControl?: 'mina' | 'miot';
}
declare class _MiService {
    MiNA?: MiNA;
    MiOT?: MIoT;
    private _initialized;
    private _initializing;
    private _speakerControl;
    /**
     * 使用 MIoT 发送 TTS 播报
     */
    playWithMiot(text: string): Promise<boolean>;
    /**
     * 使用 MiNA 发送 TTS 播报
     */
    playWithMina(text: string): Promise<boolean>;
    /**
     * 发送 TTS 播报（根据配置选择 MiNA 或 MIoT）
     */
    play(text: string): Promise<boolean>;
    /**
     * 初始化服务
     */
    init(config: MiServiceConfig & {
        announceOnStart?: boolean;
        startupMessage?: string;
    }, did: string): Promise<boolean>;
    /**
     * 获取设备列表
     */
    getDevices(config: MiServiceConfig): Promise<Array<{
        did: string;
        name: string;
        model?: string;
    }>>;
    /**
     * 重新登录
     */
    relogin(config: MiServiceConfig, did: string): Promise<boolean>;
    /**
     * 唤醒小爱音箱（进入监听状态）
     * 使用 MIoT spec 调用唤醒动作 (siid=5, aiid=3)
     * 基于 mi-gpt 项目的实现
     */
    wakeUp(): Promise<boolean>;
    /**
     * 退出监听状态（取消唤醒）
     * 使用 MiNA 暂停使小爱退出监听
     */
    unWakeUp(): Promise<void>;
}
declare const MiService: _MiService;

export { MiService, type MiServiceConfig };
