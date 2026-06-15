import { MiMoTTS } from './tts/mimo.js';

interface IPlayOptions {
    text?: string;
    url?: string;
    duration?: number;
}
interface IPlayResult {
    success: boolean;
    error?: string;
    duration?: number;
}
declare class _MiSpeaker {
    /** MiMo TTS 实例（延迟注入） */
    private _mimoTTS;
    /**
     * 注入 MiMo TTS 提供者
     */
    setMiMoTTS(tts: MiMoTTS): void;
    /**
     * 播放文字、音频链接
     * 优先使用 MiMo TTS（如果已配置），否则回退到小米原生 TTS
     */
    play(options: IPlayOptions): Promise<IPlayResult>;
    /**
     * 自定义 TTS 播放前的抑制处理
     * 暂停当前播放，防止小爱将 TTS 音频误识别为用户语音指令
     */
    private _suppressBeforeCustomTTS;
    /**
     * 设置音量
     */
    setVolume(volume: number): Promise<IPlayResult>;
    /**
     * 获取音量
     */
    getVolume(): Promise<number | undefined>;
    /**
     * 暂停播放
     */
    pause(): Promise<IPlayResult>;
    /**
     * 停止播放
     */
    stop(): Promise<IPlayResult>;
    /**
     * 播放或暂停
     */
    playOrPause(): Promise<IPlayResult>;
    /**
     * 中断小爱音箱的运行（重启设备）
     * 注意：重启需要大约 1-2s 的时间，在此期间无法使用小爱音箱自带的 TTS 服务
     */
    abortXiaoAI(): Promise<boolean>;
}
declare const MiSpeaker: _MiSpeaker;

export { type IPlayOptions, type IPlayResult, MiSpeaker };
