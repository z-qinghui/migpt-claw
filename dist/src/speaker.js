import { MiService } from "./service.js";
class _MiSpeaker {
  /** MiMo TTS 实例（延迟注入） */
  _mimoTTS = null;
  /**
   * 注入 MiMo TTS 提供者
   */
  setMiMoTTS(tts) {
    this._mimoTTS = tts;
  }
  /**
   * 播放文字、音频链接
   * 优先使用 MiMo TTS（如果已配置），否则回退到小米原生 TTS
   */
  async play(options) {
    const { text, url } = options;
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: "MiNA/MiOT service not initialized" };
    }
    try {
      let result;
      if (url) {
        if (!MiService.MiNA) {
          return { success: false, error: "MiNA service not initialized for URL playback" };
        }
        result = await MiService.MiNA.play({ url });
      } else if (text) {
        if (this._mimoTTS) {
          const ttsResult = await this._mimoTTS.synthesize(text);
          if (ttsResult.success && ttsResult.url) {
            await this._suppressBeforeCustomTTS();
            result = await MiService.MiNA.play({ url: ttsResult.url });
          } else {
            console.warn("\u26A0\uFE0F MiMo TTS \u5931\u8D25\uFF0C\u56DE\u9000\u5230\u539F\u751F TTS:", ttsResult.error);
            result = await MiService.play(text);
          }
        } else {
          result = await MiService.play(text);
        }
      } else {
        return { success: false, error: "text or url is required" };
      }
      if (result) {
        return { success: true };
      } else {
        return { success: false, error: "Playback failed" };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  /**
   * 自定义 TTS 播放前的抑制处理
   * 暂停当前播放，防止小爱将 TTS 音频误识别为用户语音指令
   */
  async _suppressBeforeCustomTTS() {
    if (MiService.MiNA) {
      await MiService.MiNA.pause().catch(() => {
      });
    }
  }
  /**
   * 设置音量
   */
  async setVolume(volume) {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: "MiNA/MiOT service not initialized" };
    }
    try {
      if (MiService.MiNA) {
        const result = await MiService.MiNA.setVolume(volume);
        if (result) {
          return { success: true };
        } else {
          return { success: false, error: "Failed to set volume" };
        }
      } else {
        return { success: false, error: "MiNA service required for volume control" };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  /**
   * 获取音量
   */
  async getVolume() {
    if (!MiService.MiNA) {
      return void 0;
    }
    try {
      return await MiService.MiNA.getVolume();
    } catch {
      return void 0;
    }
  }
  /**
   * 暂停播放
   */
  async pause() {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: "MiNA/MiOT service not initialized" };
    }
    try {
      if (MiService.MiNA) {
        const result = await MiService.MiNA.pause();
        return { success: result };
      } else {
        return { success: false, error: "MiNA service required for pause" };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  /**
   * 停止播放
   */
  async stop() {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: "MiNA/MiOT service not initialized" };
    }
    try {
      if (MiService.MiNA) {
        const result = await MiService.MiNA.stop();
        return { success: result };
      } else {
        return { success: false, error: "MiNA service required for stop" };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  /**
   * 播放或暂停
   */
  async playOrPause() {
    if (!MiService.MiNA && !MiService.MiOT) {
      return { success: false, error: "MiNA/MiOT service not initialized" };
    }
    try {
      if (MiService.MiNA) {
        const result = await MiService.MiNA.playOrPause();
        return { success: result };
      } else {
        return { success: false, error: "MiNA service required for playOrPause" };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  /**
   * 中断小爱音箱的运行（重启设备）
   * 注意：重启需要大约 1-2s 的时间，在此期间无法使用小爱音箱自带的 TTS 服务
   */
  async abortXiaoAI() {
    return false;
  }
}
const MiSpeaker = new _MiSpeaker();
export {
  MiSpeaker
};
//# sourceMappingURL=speaker.js.map