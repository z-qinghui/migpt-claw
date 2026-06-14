import { sleep } from "./parse.js";
import { jsonEncode } from "./parse.js";
import axios from "axios";
import { Debugger } from "./debug.js";
const _baseConfig = {
  proxy: false,
  decompress: true,
  headers: {
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; RMX2111 Build/QP1A.190711.020) APP/xiaomi.mico APPV/2004040 MK/Uk1YMjExMQ== PassportSDK/3.8.3 passport-ui/3.8.3"
  }
};
const _http = axios.create(_baseConfig);
_http.interceptors.response.use(
  (res) => {
    if (res.config.rawResponse) {
      return res;
    }
    return res.data;
  },
  async (err) => {
    const newResult = await tokenRefresher.refreshTokenAndRetry(err);
    if (newResult) {
      return newResult;
    }
    const error = err.response?.data?.error || err.response?.data;
    const request = {
      method: err.config.method,
      url: err.config.url,
      headers: jsonEncode(err.config.headers),
      data: jsonEncode({ body: err.config.data })
    };
    const response = !err.response ? void 0 : {
      url: err.config.url,
      status: err.response.status,
      headers: jsonEncode(err.response.headers),
      data: jsonEncode({ body: err.response.data })
    };
    return {
      isError: true,
      code: error?.code || err.response?.status || err.code || "\u672A\u77E5",
      message: error?.message || err.response?.statusText || err.message || "\u672A\u77E5",
      error: { request, response }
    };
  }
);
class HTTPClient {
  // 默认 5 秒超时
  timeout = 5 * 1e3;
  async get(url, _query, _config) {
    let query = _query;
    let config = _config;
    if (_config === void 0) {
      config = _query;
      query = void 0;
    }
    return _http.get(HTTPClient.buildURL(url, query), HTTPClient.buildConfig(config));
  }
  async post(url, data, config) {
    return _http.post(url, data, HTTPClient.buildConfig(config));
  }
  static buildURL = (url, query) => {
    const _url = new URL(url);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (isNotEmpty(value)) {
        _url.searchParams.append(key, value.toString());
      }
    }
    return _url.href;
  };
  static buildConfig = (config) => {
    if (config?.cookies) {
      config.headers = {
        ...config.headers,
        Cookie: Object.entries(config.cookies).map(([key, value]) => `${key}=${value == null ? "" : value.toString()};`).join(" ")
      };
    }
    if (config && !config.timeout) {
      config.timeout = Http.timeout;
    }
    return config;
  };
}
const Http = new HTTPClient();
function isNotEmpty(value) {
  return value !== null && value !== void 0 && value !== "";
}
class TokenRefresher {
  isRefreshing = false;
  /**
   * 自动刷新过期的凭证，并重新发送请求
   */
  async refreshTokenAndRetry(err, maxRetry = 3) {
    const isMiNA = err?.config?.url?.includes("mina.mi.com");
    const isMIoT = err?.config?.url?.includes("io.mi.com");
    if (!isMiNA && !isMIoT || err.response?.status !== 401) {
      return;
    }
    if (this.isRefreshing) {
      return;
    }
    let result;
    this.isRefreshing = true;
    let newServiceAccount = void 0;
    for (let i = 0; i < maxRetry; i++) {
      if (Debugger.debug) {
        console.log(`\u274C \u767B\u5F55\u51ED\u8BC1\u5DF2\u8FC7\u671F\uFF0C\u6B63\u5728\u5C1D\u8BD5\u5237\u65B0 Token ${i + 1}`);
      }
      newServiceAccount = await this.refreshToken(err);
      if (newServiceAccount) {
        result = await this.retry(err, newServiceAccount);
        break;
      }
      await sleep(3e3);
    }
    this.isRefreshing = false;
    if (!newServiceAccount) {
      console.error("\u274C \u5237\u65B0\u767B\u5F55\u51ED\u8BC1\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8D26\u53F7\u5BC6\u7801\u662F\u5426\u4ECD\u7136\u6709\u6548\u3002");
    }
    return result;
  }
  /**
   * 刷新登录凭证并同步到本地
   */
  async refreshToken(_err) {
    return void 0;
  }
  /**
   * 重新请求
   */
  async retry(_err, account) {
    const cookies = _err.config.cookies ?? {};
    for (const key of ["serviceToken"]) {
      if (cookies[key] && account[key]) {
        cookies[key] = account[key];
      }
    }
    for (const key of ["deviceSNProfile"]) {
      if (cookies[key] && account.device?.[key]) {
        cookies[key] = account.device[key];
      }
    }
    return _http(HTTPClient.buildConfig(_err.config));
  }
}
const tokenRefresher = new TokenRefresher();
export {
  Http
};
//# sourceMappingURL=http.js.map