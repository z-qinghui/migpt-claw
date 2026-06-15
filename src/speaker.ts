import { networkInterfaces } from 'node:os';
import { MiService } from './service.js';
import type { MiMoTTS } from './tts/mimo.js';

/**
 * 获取小爱音箱可访问的主机 IP
 * 优先使用环境变量 MIMO_TTS_HOST_IP，否则自动检测
 */
function getHostLANIP(): string {
  // 优先使用环境变量（适用于云服务器场景）
  const envIP = process.env.MIMO_TTS_HOST_IP;
  if (envIP) return envIP;

  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.internal || net.family !== 'IPv4') continue;
      if (net.address.startsWith('172.17.')) continue;
      if (
        net.address.startsWith('192.168.') ||
        net.address.startsWith('10.') ||
        net.address.startsWith('172.16.') ||
        net.address.startsWith('172.18.') ||
        net.address.startsWith('172.19.') ||
        net.address.startsWith('172.2') ||
        net.address.startsWith('172.3')
      ) {
        return net.address;
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (!net.internal && net.family === 'IPv4') return net.address;
    }
  }
  return '127.0.0.1';
}

export interface IPlayOptions {
  text?: string;
  url?: string;
  duration?: number;
}

export interface IPlayResult {
  success: boolean;
  error?: string;
  duration?: number;
}

class _MiSpeaker {
  /** MiMo TTS 实例（延迟注入） */
  private _mimoTTS: MiMoTTS | null = null;

  /**
   * 注入 MiMo TTS 提供者
   */
  setMiMoTTS(tts: MiMoTTS) {
    this._mimoTTS = tts;
  }

  /**
   * 播放文字、音频链接
   * 优先使用 MiMo TTS（如果已配置），否则回退到小米原生 TTS
   */
  async play(options: IPlayOptions): Promise<IPlayResult> {
    const { text, url } = options;

    console.log(`🔊 Speaker.play called: text=${text?.slice(0, 50)}..., url=${url}`);

    if (!MiService.MiNA && !MiService.MiOT) {
      console.error('❌ Speaker.play failed: MiNA/MiOT service not initialized');
      return { success: false, error: 'MiNA/MiOT service not initialized' };
    }

    try {
      let result: boolean;
      if (url) {
        // URL 播放只支持 MiNA
        if (!MiService.MiNA) {
          return { success: false, error: 'MiNA service not initialized for URL playback' };
        }
        console.log(`🔊 Playing URL: ${url}`);
        result = await MiService.MiNA.play({ url });
      } else if (text) {
        // 优先使用 MiMo TTS
        if (this._mimoTTS) {
          console.log(`🔊 Using MiMo TTS for: ${text.slice(0, 30)}...`);
          const ttsResult = await this._mimoTTS.synthesize(text);
          if (ttsResult.success && ttsResult.url) {
            await this._suppressBeforeCustomTTS();
            const hostIP = getHostLANIP();
            const externalUrl = ttsResult.url.replace(/0\.0\.0\.0|127\.0\.0\.1|localhost/g, hostIP);
            console.log(`🔊 MiMo TTS 播放: ${externalUrl} (时长: ${ttsResult.duration?.toFixed(1)}s)`);
            result = await MiService.MiNA!.play({ url: externalUrl });
            console.log(`🔊 MiMo TTS play result: ${result}`);
            if (result) {
              return { success: true, duration: ttsResult.duration };
            }
          } else {
            console.warn('⚠️ MiMo TTS 失败，回退到原生 TTS:', ttsResult.error);
            result = await MiService.play(text);
          }
        } else {
          // 文字播报使用配置的播放方式
          console.log(`🔊 Using native TTS for: ${text.slice(0, 30)}...`);
          result = await MiService.play(text);
        }
      } else {
        return { success: false, error: 'text or url is required' };
      }

      if (result) {
        return { success: true, duration: options.duration };
      } else {
        return { success: false, error: 'Playback failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 自定义 TTS 播放前的抑制处理
   * 暂停当前播放，防止小爱将 TTS 音频误识别为用户语音指令
   */
  private async _suppressBeforeCustomTTS() {
    if (MiService.MiNA) {
      await MiService.MiNA.pause().catch(() => {});
    }
  }

  /**
   * 设置音量
   */
  async setVolume(volume: number): Promise<IPlayResult> {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: 'MiNA/MiOT service not initialized' };
    }

    try {
      // 音量控制只支持 MiNA
      if (MiService.MiNA) {
        const result = await MiService.MiNA.setVolume(volume);
        if (result) {
          return { success: true };
        } else {
          return { success: false, error: 'Failed to set volume' };
        }
      } else {
        return { success: false, error: 'MiNA service required for volume control' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 获取音量
   */
  async getVolume(): Promise<number | undefined> {
    if (!MiService.MiNA) {
      return undefined;
    }

    try {
      return await MiService.MiNA.getVolume();
    } catch {
      return undefined;
    }
  }

  /**
   * 暂停播放
   */
  async pause(): Promise<IPlayResult> {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: 'MiNA/MiOT service not initialized' };
    }

    try {
      // 暂停只支持 MiNA
      if (MiService.MiNA) {
        const result = await MiService.MiNA.pause();
        return { success: result };
      } else {
        return { success: false, error: 'MiNA service required for pause' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 停止播放
   */
  async stop(): Promise<IPlayResult> {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: 'MiNA/MiOT service not initialized' };
    }

    try {
      // 停止只支持 MiNA
      if (MiService.MiNA) {
        const result = await MiService.MiNA.stop();
        return { success: result };
      } else {
        return { success: false, error: 'MiNA service required for stop' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 播放或暂停
   */
  async playOrPause(): Promise<IPlayResult> {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: 'MiNA/MiOT service not initialized' };
    }

    try {
      // 播放或暂停只支持 MiNA
      if (MiService.MiNA) {
        const result = await MiService.MiNA.playOrPause();
        return { success: result };
      } else {
        return { success: false, error: 'MiNA service required for playOrPause' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 中断小爱音箱的运行（重启设备）
   * 注意：重启需要大约 1-2s 的时间，在此期间无法使用小爱音箱自带的 TTS 服务
   */
  async abortXiaoAI(): Promise<boolean> {
    // 无法通过 MiOT 中断小爱运行
    // 可以通过 MiOT 重启设备，但这会影响所有功能
    return false;
  }
}

export const MiSpeaker = new _MiSpeaker();
