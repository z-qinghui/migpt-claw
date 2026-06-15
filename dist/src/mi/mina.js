import { encodeQuery } from "../utils/codec.js";
import { Debugger } from "../utils/debug.js";
import { jsonEncode, jsonDecode } from "../utils/parse.js";
import { uuid } from "../utils/hash.js";
import { Http } from "../utils/http.js";
import { updateMiAccount } from "./common.js";
class MiNA {
  account;
  constructor(account) {
    this.account = account;
  }
  static async getDevice(account) {
    if (account.sid !== "micoapi") {
      return account;
    }
    const devices = await MiNA.__callMiNA(account, "GET", "/admin/v2/device_list");
    if (Debugger.debug) {
      console.log("\u{1F41B} MiNA \u8BBE\u5907\u5217\u8868\uFF1A", jsonEncode(devices, { prettier: true }));
    }
    console.log("\u{1F50D} \u67E5\u627E\u8BBE\u5907 account.did:", account.did);
    const device = (devices ?? []).find((e) => {
      const matches = [e.deviceID, e.miotDID, e.name, e.alias, e.mac].includes(account.did);
      console.log(`\u{1F50D} \u68C0\u67E5\u8BBE\u5907 ${e.name} (miotDID: ${e.miotDID}):`, {
        deviceID: e.deviceID,
        miotDID: e.miotDID,
        name: e.name,
        alias: e.alias,
        mac: e.mac,
        matches
      });
      return matches;
    });
    if (device) {
      account.device = { ...device, deviceId: device.deviceID };
      console.log("\u2705 \u627E\u5230\u8BBE\u5907:", device.name);
    } else {
      console.error("\u274C \u672A\u627E\u5230\u5339\u914D\u7684\u8BBE\u5907\uFF0Caccount.did:", account.did);
    }
    return account;
  }
  static async __callMiNA(account, method, path, _data) {
    const data = {
      ..._data,
      requestId: uuid(),
      timestamp: Math.floor(Date.now() / 1e3)
    };
    const url = `https://api2.mina.mi.com${path}`;
    const config = {
      account,
      setAccount: updateMiAccount(account),
      headers: { "User-Agent": "MICO/AndroidApp/@SHIP.TO.2A2FE0D7@/2.4.40" },
      cookies: {
        userId: account.userId,
        serviceToken: account.serviceToken,
        sn: account.device?.serialNumber,
        hardware: account.device?.hardware,
        deviceId: account.device?.deviceId,
        deviceSNProfile: account.device?.deviceSNProfile
      }
    };
    let res;
    if (method === "GET") {
      res = await Http.get(url, data, config);
    } else {
      res = await Http.post(url, encodeQuery(data), config);
    }
    if (res.code !== 0) {
      if (Debugger.debug) {
        console.error("\u274C _callMiNA failed", res);
      }
      return void 0;
    }
    return res.data;
  }
  async _callMiNA(method, path, data) {
    return MiNA.__callMiNA(this.account, method, path, data);
  }
  /**
   * 调用小爱音箱上的 ubus 服务
   */
  callUbus(scope, command, _message) {
    const message = jsonEncode(_message ?? {});
    return this._callMiNA("POST", "/remote/ubus", {
      deviceId: this.account.device?.deviceId,
      path: scope,
      method: command,
      message
    });
  }
  /**
   * 获取设备列表
   */
  getDevices() {
    return this._callMiNA("GET", "/admin/v2/device_list");
  }
  /**
   * 获取设备播放状态
   */
  async getStatus() {
    const data = await this.callUbus("mediaplayer", "player_get_play_status");
    const res = jsonDecode(data?.info);
    if (!data || data.code !== 0 || !res) {
      return;
    }
    const map = { 0: "idle", 1: "playing", 2: "paused", 3: "stopped" };
    return {
      ...res,
      status: map[res.status] ?? "unknown",
      volume: res.volume
    };
  }
  /**
   * 获取音量
   */
  async getVolume() {
    const data = await this.getStatus();
    return data?.volume;
  }
  /**
   * 设置音量
   */
  async setVolume(_volume) {
    const volume = Math.round(clamp(_volume, 6, 100));
    const res = await this.callUbus("mediaplayer", "player_set_volume", {
      volume
    });
    return res?.code === 0;
  }
  /**
   * 播放
   */
  async play({ text, url, save = 0 } = {}) {
    let res;
    if (url) {
      console.log(`\u{1F50A} MiNA.play URL: ${url}`);
      res = await this.callUbus("mediaplayer", "player_play_url", {
        url,
        type: 1
      });
      console.log(`\u{1F50A} MiNA.play URL result:`, JSON.stringify(res));
    } else if (text) {
      console.log(`\u{1F50A} MiNA.play text: ${text.slice(0, 50)}...`);
      res = await this.callUbus("mibrain", "text_to_speech", {
        text,
        save
      });
      console.log(`\u{1F50A} MiNA.play text result:`, JSON.stringify(res));
    } else {
      res = await this.callUbus("mediaplayer", "player_play_operation", {
        action: "play"
      });
    }
    return res?.code === 0;
  }
  /**
   * 暂停播放
   */
  async pause() {
    const res = await this.callUbus("mediaplayer", "player_play_operation", {
      action: "pause"
    });
    return res?.code === 0;
  }
  /**
   * 播放或暂停
   */
  async playOrPause() {
    const res = await this.callUbus("mediaplayer", "player_play_operation", {
      action: "toggle"
    });
    return res?.code === 0;
  }
  /**
   * 停止播放
   */
  async stop() {
    const res = await this.callUbus("mediaplayer", "player_play_operation", {
      action: "stop"
    });
    return res?.code === 0;
  }
  /**
   * 获取对话消息列表
   */
  async getConversations(options) {
    const { limit = 10, timestamp } = options ?? {};
    const res = await Http.get(
      "https://userprofile.mina.mi.com/device_profile/v2/conversation",
      {
        limit,
        timestamp,
        requestId: uuid(),
        source: "dialogu",
        hardware: this.account.device?.hardware
      },
      {
        account: this.account,
        setAccount: updateMiAccount(this.account),
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; 000; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36 /XiaoMi/HybridView/ micoSoundboxApp/i appVersion/A_2.4.40",
          Referer: "https://userprofile.mina.mi.com/dialogue-note/index.html"
        },
        cookies: {
          userId: this.account.userId,
          serviceToken: this.account.serviceToken,
          deviceId: this.account.device?.deviceId
        }
      }
    );
    if (res.code !== 0) {
      if (Debugger.debug) {
        console.error("\u274C getConversations failed", res);
      }
      return void 0;
    }
    return jsonDecode(res.data);
  }
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
export {
  MiNA
};
//# sourceMappingURL=mina.js.map