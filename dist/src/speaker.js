import { networkInterfaces } from "node:os";
import { MiService } from "./service.js";
function getHostLANIP() {
  const envIP = process.env.MIMO_TTS_HOST_IP;
  if (envIP) return envIP;
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.internal || net.family !== "IPv4") continue;
      if (net.address.startsWith("172.17.")) continue;
      if (net.address.startsWith("192.168.") || net.address.startsWith("10.") || net.address.startsWith("172.16.") || net.address.startsWith("172.18.") || net.address.startsWith("172.19.") || net.address.startsWith("172.2") || net.address.startsWith("172.3")) {
        return net.address;
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (!net.internal && net.family === "IPv4") return net.address;
    }
  }
  return "127.0.0.1";
}
class _MiSpeaker {
  /** MiMo TTS 实例（延迟注入） */
  _mimoTTS = null;
  /**
   * 注入 MiMo TTS 提供者（自动清理旧实例，防止端口泄漏）
   */
  async setMiMoTTS(tts) {
    if (this._mimoTTS) {
      console.log("\u{1F50A} \u6E05\u7406\u65E7 MiMo TTS \u5B9E\u4F8B...");
      await this._mimoTTS.destroy().catch(() => {
      });
    }
    this._mimoTTS = tts;
  }
  /**
   * 清理 MiMo TTS 资源（释放端口和临时文件）
   */
  async cleanupMiMoTTS() {
    if (this._mimoTTS) {
      console.log("\u{1F50A} \u6E05\u7406 MiMo TTS \u8D44\u6E90...");
      await this._mimoTTS.destroy().catch(() => {
      });
      this._mimoTTS = null;
    }
  }
  /**
   * 播放文字、音频链接
   * 优先使用 MiMo TTS（如果已配置），否则回退到小米原生 TTS
   */
  async play(options) {
    const { text, url } = options;
    console.log(`\u{1F50A} Speaker.play called: text=${text?.slice(0, 50)}..., url=${url}`);
    if (!MiService.MiNA && !MiService.MiOT) {
      console.error("\u274C Speaker.play failed: MiNA/MiOT service not initialized");
      return { success: false, error: "MiNA/MiOT service not initialized" };
    }
    try {
      let result;
      if (url) {
        if (!MiService.MiNA) {
          return { success: false, error: "MiNA service not initialized for URL playback" };
        }
        console.log(`\u{1F50A} Playing URL: ${url}`);
        result = await MiService.MiNA.play({ url });
      } else if (text) {
        if (this._mimoTTS) {
          console.log(`\u{1F50A} Using MiMo TTS for: ${text.slice(0, 30)}...`);
          const ttsResult = await this._mimoTTS.synthesize(text);
          if (ttsResult.success && ttsResult.url) {
            await this._suppressBeforeCustomTTS();
            const hostIP = getHostLANIP();
            const externalUrl = ttsResult.url.replace(/0\.0\.0\.0|127\.0\.0\.1|localhost/g, hostIP);
            console.log(`\u{1F50A} MiMo TTS \u64AD\u653E: ${externalUrl} (\u65F6\u957F: ${ttsResult.duration?.toFixed(1)}s)`);
            const duration = ttsResult.duration;
            result = await MiService.MiNA.play({ url: externalUrl });
            console.log(`\u{1F50A} MiMo TTS play result: ${result}`);
            return { success: result, duration };
          } else {
            console.warn("\u26A0\uFE0F MiMo TTS \u5931\u8D25\uFF0C\u56DE\u9000\u5230\u539F\u751F TTS:", ttsResult.error);
            result = await MiService.play(text);
          }
        } else {
          console.log(`\u{1F50A} Using native TTS for: ${text.slice(0, 30)}...`);
          result = await MiService.play(text);
        }
      } else {
        return { success: false, error: "text or url is required" };
      }
      if (result) {
        return { success: true, duration: options.duration };
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