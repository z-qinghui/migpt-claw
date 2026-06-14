import { jsonEncode } from "../utils/parse.js";
import { decodeMIoT, encodeFormData, encodeMIoT } from "../utils/codec.js";
import { Http } from "../utils/http.js";
import { updateMiAccount } from "./common.js";
import { Debugger } from "../utils/debug.js";
class MIoT {
  account;
  constructor(account) {
    this.account = account;
  }
  static async getDevice(account) {
    if (account.sid !== "xiaomiio") {
      return account;
    }
    const devices = await MIoT.__callMIoT(account, "POST", "/home/device_list", {
      getVirtualModel: false,
      getHuamiDevices: 0
    });
    if (Debugger.debug) {
      console.log("\u{1F41B} MIoT \u8BBE\u5907\u5217\u8868\uFF1A", jsonEncode(devices, { prettier: true }));
    }
    const device = (devices?.list ?? []).find(
      (e) => [e.did, e.name, e.mac].includes(account.did)
    );
    if (device) {
      account.device = device;
    }
    return account;
  }
  static async __callMIoT(account, method, path, _data) {
    const url = `https://api.io.mi.com/app${path}`;
    const config = {
      account,
      setAccount: updateMiAccount(account),
      rawResponse: true,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
        "x-xiaomi-protocal-flag-cli": "PROTOCAL-HTTP2"
      },
      cookies: {
        userId: account.userId,
        serviceToken: account.serviceToken,
        PassportDeviceId: account.deviceId
      }
    };
    const data = encodeMIoT(path, _data, account.pass.ssecurity);
    if (Debugger.debug) {
      console.log("MIoT \u8BF7\u6C42:", {
        url,
        method,
        cookies: config.cookies,
        body: data
      });
    }
    let res;
    if (method === "GET") {
      res = await Http.get(url, data, config);
    } else {
      const formData = encodeFormData(data);
      if (Debugger.debug) {
        console.log("POST body:", formData);
      }
      res = await Http.post(url, formData, {
        ...config,
        headers: {
          ...config.headers,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
    }
    if (res.status === 401) {
      console.error("\u274C 401 \u9519\u8BEF\u54CD\u5E94:", res.data);
      return void 0;
    }
    if (res.data && typeof res.data === "object" && res.data.code === 0) {
      return res.data.result;
    }
    if (typeof res.data === "string") {
      try {
        res = await decodeMIoT(
          account.pass.ssecurity,
          data._nonce,
          res.data,
          res.headers["miot-content-encoding"] === "GZIP"
        );
        return res?.result;
      } catch (e) {
        console.error("\u274C \u89E3\u5BC6\u5931\u8D25:", e);
        return void 0;
      }
    }
    console.error("\u274C \u672A\u77E5\u54CD\u5E94\u683C\u5F0F:", res);
    return void 0;
  }
  async _callMIoT(method, path, data) {
    return MIoT.__callMIoT(this.account, method, path, data);
  }
  /**
   * 获取 MIoT 设备列表
   */
  async getDevices(getVirtualModel = false, getHuamiDevices = 0) {
    const res = await this._callMIoT("POST", "/home/device_list", {
      getVirtualModel,
      getHuamiDevices
    });
    return res?.list;
  }
  /**
   * 获取 MIoT 设备属性值
   */
  async getProperty(scope, property) {
    const res = await this._callMIoTSpec("prop/get", [
      {
        did: this.account.device.did,
        siid: scope,
        piid: property
      }
    ]);
    return (res ?? [])?.[0]?.value;
  }
  /**
   * 设置 MIoT 设备属性值
   */
  async setProperty(scope, property, value) {
    const res = await this._callMIoTSpec("prop/set", [
      {
        did: this.account.device.did,
        siid: scope,
        piid: property,
        value
      }
    ]);
    return (res ?? [])?.[0]?.code === 0;
  }
  /**
   * 调用 MIoT 设备能力指令
   */
  async doAction(scope, action, args = []) {
    const res = await this._callMIoTSpec("action", {
      did: this.account.device.did,
      siid: scope,
      aiid: action,
      in: Array.isArray(args) ? args : [args]
    });
    return res?.code === 0;
  }
  /**
   * 调用 MIoT 设备 RPC 指令
   */
  rpc(method, params, id = 1) {
    return this._callMIoT("POST", `/home/rpc/${this.account.device.did}`, {
      id,
      method,
      params
    });
  }
  _callMIoTSpec(command, params, datasource = 2) {
    return this._callMIoT("POST", `/miotspec/${command}`, {
      params,
      datasource
    });
  }
}
export {
  MIoT
};
//# sourceMappingURL=miot.js.map