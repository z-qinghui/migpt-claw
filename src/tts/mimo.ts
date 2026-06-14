/**
 * MiMo-V2.5-TT TTS Provider
 *
 * 使用小米 MiMo TTS API 生成语音，通过本地 HTTP 服务器提供给音箱播放。
 * API 文档: https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/speech-synthesis-v2.5
 */
import { createServer, type Server } from 'node:http';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export interface MiMoTTSConfig {
  /** MiMo API Key */
  apiKey: string;
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

export class MiMoTTS {
  private _server: Server | null = null;
  private _serverUrl = '';
  private _audioDir = '';
  private _config: Required<MiMoTTSConfig>;
  private _ready = false;

  constructor(config: MiMoTTSConfig) {
    this._config = {
      apiKey: config.apiKey,
      model: config.model ?? 'mimo-v2.5-tts',
      voice: config.voice ?? 'mimo_default',
      style: config.style ?? '',
      stream: config.stream ?? true,
      port: config.port ?? 0,
      host: config.host ?? '0.0.0.0',
    };
  }

  /**
   * 初始化：创建临时目录 + 启动 HTTP 服务器
   */
  async init(): Promise<boolean> {
    if (this._ready) return true;

    try {
      this._audioDir = join(tmpdir(), 'migpt-claw-tts', randomUUID());
      await mkdir(this._audioDir, { recursive: true });

      this._server = createServer((req, res) => {
        const url = decodeURIComponent(req.url ?? '');
        if (!url.startsWith('/audio/')) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        const filePath = join(this._audioDir, url.replace('/audio/', ''));
        serveWavFile(filePath, res).catch(() => {
          res.writeHead(404);
          res.end('Not Found');
        });
      });

      await new Promise<void>((resolve, reject) => {
        this._server!.listen(this._config.port, this._config.host, () => {
          const addr = this._server!.address();
          if (addr && typeof addr === 'object') {
            this._serverUrl = `http://${addr.address === '::' ? 'localhost' : addr.address}:${addr.port}`;
            this._ready = true;
            resolve();
          } else {
            reject(new Error('Failed to get server address'));
          }
        });
        this._server!.on('error', reject);
      });

      console.log(`✅ MiMo TTS 服务器已启动: ${this._serverUrl}`);
      return true;
    } catch (err: any) {
      console.error('❌ MiMo TTS 初始化失败:', err.message);
      return false;
    }
  }

  /**
   * 生成语音并返回可播放的 URL
   */
  async synthesize(text: string, options?: {
    voice?: string;
    style?: string;
  }): Promise<{ url: string; success: boolean; error?: string }> {
    if (!this._ready) {
      const ok = await this.init();
      if (!ok) return { url: '', success: false, error: 'TTS server not initialized' };
    }

    try {
      // 构建请求
      const messages: Array<{ role: string; content: string }> = [];

      const style = options?.style ?? this._config.style;
      if (style) {
        messages.push({ role: 'user', content: style });
      }

      messages.push({ role: 'assistant', content: text });

      const voice = options?.voice ?? this._config.voice;

      const useStream = this._config.stream;

      const body = {
        model: this._config.model,
        messages,
        audio: { format: useStream ? 'pcm16' : 'wav', voice },
        stream: useStream,
      };

      // 调用 MiMo API
      const response = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'api-key': this._config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown');
        return { url: '', success: false, error: `MiMo API error ${response.status}: ${errText}` };
      }

      let audioBuffer: Buffer;

      if (useStream) {
        // 流式模式：收集所有 PCM16 chunk 并拼接为 WAV
        const pcmChunks: Buffer[] = [];
        const reader = response.body?.getReader();
        if (!reader) {
          return { url: '', success: false, error: 'Failed to read streaming response' };
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const chunk = JSON.parse(jsonStr);
              const audioData = chunk?.choices?.[0]?.delta?.audio?.data;
              if (audioData) {
                pcmChunks.push(Buffer.from(audioData, 'base64'));
              }
            } catch {
              // 忽略解析错误
            }
          }
        }

        if (pcmChunks.length === 0) {
          return { url: '', success: false, error: 'No audio data in streaming response' };
        }

        // PCM16 → WAV（24kHz, mono, 16-bit）
        const pcmData = Buffer.concat(pcmChunks);
        audioBuffer = pcmToWav(pcmData, 24000, 1, 16);
      } else {
        // 非流式模式：直接从响应中获取 WAV
        const data = await response.json() as any;
        const audioBase64 = data?.choices?.[0]?.message?.audio?.data;

        if (!audioBase64) {
          return { url: '', success: false, error: 'No audio data in MiMo response' };
        }

        audioBuffer = Buffer.from(audioBase64, 'base64');
      }

      // 保存音频文件
      const fileName = `${randomUUID()}.wav`;
      const filePath = join(this._audioDir, fileName);
      await writeFile(filePath, audioBuffer);

      const url = `${this._serverUrl}/audio/${fileName}`;
      return { url, success: true };
    } catch (err: any) {
      return { url: '', success: false, error: err.message };
    }
  }

  /**
   * 清理临时文件和关闭服务器
   */
  async destroy() {
    if (this._server) {
      await new Promise<void>((resolve) => {
        this._server!.close(() => resolve());
      });
      this._server = null;
    }
    if (this._audioDir) {
      await rm(this._audioDir, { recursive: true, force: true }).catch(() => {});
    }
    this._ready = false;
  }

  get ready() {
    return this._ready;
  }

  get serverUrl() {
    return this._serverUrl;
  }
}

/**
 * 将 WAV 文件作为 HTTP 响应返回
 */
async function serveWavFile(filePath: string, res: import('node:http').ServerResponse) {
  const { readFile } = await import('node:fs/promises');
  const data = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': 'audio/wav',
    'Content-Length': data.length,
    'Cache-Control': 'no-cache',
  });
  res.end(data);
}

/**
 * PCM16 原始数据 → WAV 文件 Buffer
 * @param pcmData PCM16 原始音频数据
 * @param sampleRate 采样率（MiMo TTS 流式输出为 24000）
 * @param channels 声道数（1 = mono）
 * @param bitsPerSample 每样本位数（16）
 */
function pcmToWav(pcmData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);           // sub-chunk size
  buffer.writeUInt16LE(1, 20);            // PCM format
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);

  return buffer;
}
