import { getMiService } from "./mi/common.js";
import { assert, sleep } from "./utils/parse.js";
import { Debugger } from "./utils/debug.js";
class _MiService {
  MiNA;
  MiOT;
  _initialized = false;
  _initializing = false;
  _speakerControl = "mina";
  /**
   * 使用 MIoT 发送 TTS 播报
   */
  async playWithMiot(text) {
    if (!this.MiOT) {
      console.warn("\u26A0\uFE0F MIoT \u670D\u52A1\u4E0D\u53EF\u7528");
      return false;
    }
    try {
      const result = await this.MiOT.doAction(5, 1, [text]);
      return result;
    } catch (e) {
      console.error("\u274C MIoT TTS \u5931\u8D25:", e?.message || e);
      return false;
    }
  }
  /**
   * 使用 MiNA 发送 TTS 播报
   */
  async playWithMina(text) {
    if (!this.MiNA) {
      console.warn("\u26A0\uFE0F MiNA \u670D\u52A1\u4E0D\u53EF\u7528");
      return false;
    }
    try {
      const result = await this.MiNA.play({ text });
      return result;
    } catch (e) {
      console.error("\u274C MiNA TTS \u5931\u8D25:", e?.message || e);
      return false;
    }
  }
  /**
   * 发送 TTS 播报（根据配置选择 MiNA 或 MIoT）
   */
  async play(text) {
    if (this._speakerControl === "miot") {
      return this.playWithMiot(text);
    } else {
      return this.playWithMina(text);
    }
  }
  /**
   * 初始化服务
   */
  async init(config, did) {
    if (this._initialized) {
      console.log("\u2705 MiService \u5DF2\u521D\u59CB\u5316\uFF0C\u8DF3\u8FC7");
      return true;
    }
    if (this._initializing) {
      let waitCount = 0;
      while (this._initializing && waitCount < 30) {
        await sleep(100);
        waitCount++;
      }
      return this._initialized;
    }
    this._initializing = true;
    try {
      console.log("\u{1F680} \u5F00\u59CB\u521D\u59CB\u5316 MiService...");
      console.log("\u{1F4CB} \u914D\u7F6E\u4FE1\u606F:", {
        did,
        userId: config.userId,
        hasPassword: !!config.password,
        hasPassToken: !!config.passToken,
        debug: config.debug,
        timeout: config.timeout,
        speakerControl: config.speakerControl
      });
      assert(!!did, "\u274C Speaker \u7F3A\u5C11 did \u53C2\u6570");
      assert(
        !!config.passToken || !!config.userId && !!config.password,
        "\u274C Speaker \u7F3A\u5C11 passToken \u6216 userId \u548C password"
      );
      Debugger.debug = config.debug ?? false;
      this._speakerControl = config.speakerControl ?? "mina";
      const serviceConfig = {
        ...config,
        did,
        timeout: Math.max(1e3, config.timeout ?? 5e3)
      };
      console.log("\u{1F50C} \u6B63\u5728\u8FDE\u63A5 MiNA \u670D\u52A1...");
      this.MiNA = await getMiService({ ...serviceConfig, service: "mina" });
      console.log("\u{1F50C} \u67E5\u8BE2 MiNA \u670D\u52A1\u7ED3\u679C\uFF1A", { mina: !!this.MiNA });
      console.log("\u{1F50C} \u6B63\u5728\u8FDE\u63A5 MIoT \u670D\u52A1...");
      this.MiOT = await getMiService({ ...serviceConfig, service: "miot" });
      console.log("\u{1F50C} \u67E5\u8BE2 MIoT \u670D\u52A1\u7ED3\u679C\uFF1A", { miot: !!this.MiOT });
      assert(!!this.MiNA, "\u274C \u521D\u59CB\u5316 MiNA \u670D\u52A1\u5931\u8D25");
      if (!this.MiOT) {
        console.warn("\u26A0\uFE0F MIoT \u670D\u52A1\u521D\u59CB\u5316\u5931\u8D25\uFF0C\u90E8\u5206\u8BBE\u5907\u63A7\u5236\u529F\u80FD\u53EF\u80FD\u4E0D\u53EF\u7528");
      }
      if (Debugger.debug) {
        const device = this.MiNA?.account?.device;
        console.debug(
          "\u{1F41B} \u8BBE\u5907\u4FE1\u606F\uFF1A",
          JSON.stringify(
            {
              name: device?.name,
              desc: device?.desc,
              model: device?.model,
              rom: device?.extra?.fw_version
            },
            null,
            2
          )
        );
      }
      this._initialized = true;
      console.log("\u2705 MiService \u521D\u59CB\u5316\u6210\u529F");
      console.log(`\u{1F50A} \u97F3\u7BB1\u63A7\u5236\u65B9\u5F0F\uFF1A${this._speakerControl}`);
      const announceOnStart = config.announceOnStart ?? true;
      if (announceOnStart) {
        const startupMessage = config.startupMessage ?? "\u60A8\u7684\u5C0F\u9F99\u867E\u5DF2\u4E0A\u7EBF\uFF0C\u968F\u65F6\u4E3A\u60A8\u670D\u52A1";
        try {
          console.log("\u{1F50A} \u6B63\u5728\u53D1\u9001\u542F\u52A8\u64AD\u62A5:", startupMessage);
          await this.play(startupMessage);
          console.log("\u2705 \u542F\u52A8\u64AD\u62A5\u53D1\u9001\u6210\u529F");
        } catch (e) {
          console.warn("\u26A0\uFE0F \u542F\u52A8\u64AD\u62A5\u53D1\u9001\u5931\u8D25:", e?.message || e);
        }
      }
      return true;
    } catch (err) {
      console.error("\u274C \u521D\u59CB\u5316\u5931\u8D25:", { err, message: err.message });
      return false;
    } finally {
      this._initializing = false;
    }
  }
  /**
   * 获取设备列表
   */
  async getDevices(config) {
    try {
      const tempService = await getMiService({ ...config, service: "mina", relogin: false });
      if (!tempService) {
        return [];
      }
      const devices = await tempService.getDevices();
      return (devices || []).map((d) => ({
        did: d.name || d.alias || d.deviceID,
        name: d.alias || d.name,
        model: d.model
      }));
    } catch (err) {
      console.error("\u274C \u83B7\u53D6\u8BBE\u5907\u5217\u8868\u5931\u8D25:", err);
      return [];
    }
  }
  /**
   * 重新登录
   */
  async relogin(config, did) {
    this._initialized = false;
    return this.init(config, did);
  }
  /**
   * 唤醒小爱音箱（进入监听状态）
   * 使用 MIoT spec 调用唤醒动作 (siid=5, aiid=3)
   * 基于 mi-gpt 项目的实现
   */
  async wakeUp() {
    if (!this.MiOT) {
      console.warn("\u26A0\uFE0F MIoT \u670D\u52A1\u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u5524\u9192\u97F3\u7BB1");
      return false;
    }
    try {
      const result = await this.MiOT.doAction(5, 3, []);
      return result;
    } catch (e) {
      console.warn("\u26A0\uFE0F \u5524\u9192\u97F3\u7BB1\u5931\u8D25:", e?.message || e);
      return false;
    }
  }
  /**
   * 退出监听状态（取消唤醒）
   * 使用 MiNA 暂停使小爱退出监听
   */
  async unWakeUp() {
    if (this.MiNA) {
      await this.MiNA.pause().catch(() => {
      });
    }
  }
}
const MiService = new _MiService();
export {
  MiService
};
//# sourceMappingURL=service.js.map