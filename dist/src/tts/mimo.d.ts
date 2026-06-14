interface MiMoTTSConfig {
    /** MiMo API Key */
    apiKey: string;
    /** MiMo API Base URL，默认 https://api.xiaomimimo.com/v1 */
    baseUrl?: string;
    /** TTS 模型，默认 mimo-v2.5-tts */
    model?: string;
    /** 预设音色 ID，默认 mimo_default */
    voice?: string;
    /** 风格指令（放在 user role 中） */
    style?: string;
    /** 是否启用流式传输（减少首字延迟），默认 true */
    stream?: boolean;
    /** 本地服务器监听端口，0 = 自动分配 */
    port?: number;
    /** 本地服务器监听地址，默认 0.0.0.0 */
    host?: string;
}
declare class MiMoTTS {
    private _server;
    private _serverUrl;
    private _audioDir;
    private _config;
    private _ready;
    constructor(config: MiMoTTSConfig);
    /**
     * 初始化：创建临时目录 + 启动 HTTP 服务器
     */
    init(): Promise<boolean>;
    /**
     * 生成语音并返回可播放的 URL
     */
    synthesize(text: string, options?: {
        voice?: string;
        style?: string;
    }): Promise<{
        url: string;
        success: boolean;
        error?: string;
    }>;
    /**
     * 清理临时文件和关闭服务器
     */
    destroy(): Promise<void>;
    get ready(): boolean;
    get serverUrl(): string;
}

export { MiMoTTS, type MiMoTTSConfig };
