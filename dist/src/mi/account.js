import { encodeQuery, parseAuthPass } from "../utils/codec.js";
import { md5, sha1 } from "../utils/hash.js";
import { Http } from "../utils/http.js";
import { MiNA } from "./mina.js";
import { MIoT } from "./miot.js";
const kLoginAPI = "https://account.xiaomi.com/pass";
async function getAccount(_account) {
  let account = _account;
  console.log("\u{1F510} \u8BA4\u8BC1\u4FE1\u606F:", {
    userId: account.userId,
    hasPassToken: !!account.passToken,
    hasPassword: !!account.password,
    hasServiceToken: !!account.serviceToken,
    authMode: account.password ? "password" : account.passToken ? "passToken" : "unknown"
  });
  if (account.passToken && account.serviceToken && account.pass?.ssecurity) {
    console.log("\u{1F504} \u5C1D\u8BD5\u4F7F\u7528\u7F13\u5B58\u7684\u767B\u5F55\u6001 (passToken + serviceToken + ssecurity)...");
    account.pass = {
      code: 0,
      passToken: account.passToken,
      ssecurity: account.pass.ssecurity,
      nonce: account.pass.nonce || ""
    };
    let devices;
    if (account.sid === "micoapi") {
      devices = await MiNA.getDevice(account);
    } else if (account.sid === "xiaomiio") {
      devices = await MIoT.getDevice(account);
    } else {
      devices = account;
    }
    if (devices.device) {
      console.log("\u2705 \u4F7F\u7528\u7F13\u5B58\u7684\u767B\u5F55\u6001\u6210\u529F");
      return devices;
    }
    console.log("\u26A0\uFE0F \u7F13\u5B58\u7684\u767B\u5F55\u6001\u5DF2\u5931\u6548\uFF0C\u4F7F\u7528\u5BC6\u7801\u91CD\u65B0\u767B\u5F55...");
  }
  if (account.password) {
    console.log("\u{1F511} \u4F7F\u7528\u5BC6\u7801\u767B\u5F55\uFF08passToken \u4F5C\u4E3A Cookie \u8F85\u52A9\uFF09...");
  } else if (account.passToken) {
    console.log("\u26A0\uFE0F \u4EC5\u6709 passToken \u65E0\u6CD5\u76F4\u63A5\u767B\u5F55\uFF0CpassToken \u9700\u8981\u914D\u5408\u5BC6\u7801\u4F7F\u7528");
  }
  let res = await Http.get(
    `${kLoginAPI}/serviceLogin`,
    { sid: account.sid, _json: true, _locale: "zh_CN" },
    { cookies: _getLoginCookies(account) }
  );
  if (res.isError) {
    console.error("\u274C \u767B\u5F55\u5931\u8D25", res);
    return void 0;
  }
  let pass = parseAuthPass(res);
  console.log("\u{1F4DD} serviceLogin \u54CD\u5E94:", { code: pass.code, description: pass.description, res });
  if (pass.code !== 0) {
    console.log("\u{1F4DD} \u767B\u5F55\u6001\u5931\u6548\uFF0C\u5C1D\u8BD5\u91CD\u65B0\u8BA4\u8BC1...");
    if (!account.password) {
      console.error("\u274C \u7F3A\u5C11\u5BC6\u7801\uFF0C\u65E0\u6CD5\u91CD\u65B0\u767B\u5F55\u3002\u8BF7\u914D\u7F6E password \u5B57\u6BB5\u3002");
      return void 0;
    }
    const data = {
      _json: "true",
      qs: pass.qs,
      sid: account.sid,
      _sign: pass._sign,
      callback: pass.callback,
      user: account.userId,
      hash: md5(account.password).toUpperCase()
    };
    res = await Http.post(`${kLoginAPI}/serviceLoginAuth2`, encodeQuery(data), {
      cookies: _getLoginCookies(account)
    });
    if (res.isError) {
      console.error("\u274C OAuth2 \u767B\u5F55\u5931\u8D25", res);
      return void 0;
    }
    console.log("\u8FD4\u56DE\u7ED3\u679C\uFF1A", res.data);
    pass = parseAuthPass(res);
    console.log("\u{1F4DD} serviceLoginAuth2 \u54CD\u5E94:", {
      code: pass.code,
      hasPassToken: !!pass.passToken,
      hasSsecurity: !!pass.ssecurity,
      description: pass.description
    });
  }
  if (pass.location?.includes("identity/authStart")) {
    console.error("\u274C \u672C\u6B21\u767B\u5F55\u9700\u8981\u9A8C\u8BC1\u7801\uFF0C\u8BF7\u68C0\u67E5 passToken \u662F\u5426\u6B63\u786E");
    console.log("\u{1F4A1} \u5F53\u524D\u4F7F\u7528\u7684 passToken:", account.passToken?.slice(0, 20) + "...");
    return void 0;
  }
  if (!pass.location || !pass.nonce || !pass.ssecurity) {
    console.error("\u274C \u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u4F60\u7684\u8D26\u53F7\u5BC6\u7801\u662F\u5426\u6B63\u786E");
    console.log("\u{1F4CB} \u8FD4\u56DE\u6570\u636E:", {
      hasLocation: !!pass.location,
      hasNonce: !!pass.nonce,
      hasSsecurity: !!pass.ssecurity,
      hasPassToken: !!pass.passToken,
      code: pass.code,
      description: pass.description
    });
    return void 0;
  }
  console.log("\u2705 \u767B\u5F55\u6210\u529F\uFF0C\u83B7\u53D6 serviceToken...");
  const serviceToken = await _getServiceToken(pass);
  if (!serviceToken) {
    return void 0;
  }
  console.log("\u2705 \u83B7\u53D6 serviceToken \u6210\u529F", { account, serviceToken });
  account = { ...account, pass, serviceToken };
  console.log("\u{1F4F1} \u6B63\u5728\u83B7\u53D6\u8BBE\u5907\u4FE1\u606F... account.did =", account.did);
  console.log("\u{1F4F1} \u4F7F\u7528\u7684 deviceId:", account.deviceId);
  if (account.sid === "micoapi") {
    account = await MiNA.getDevice(account);
    console.log("\u{1F4F1} MiNA.getDevice \u7ED3\u679C\uFF1Aaccount.device =", account?.device);
  } else if (account.sid === "xiaomiio") {
    account = await MIoT.getDevice(account);
    console.log("\u{1F4F1} MIoT.getDevice \u7ED3\u679C\uFF1Aaccount.device =", account?.device);
  }
  if (account.did && !account.device) {
    console.error(`\u274C \u627E\u4E0D\u5230\u8BBE\u5907\uFF1A${account.did}`);
    console.log(
      "\u{1F41B} \u8BF7\u68C0\u67E5\u4F60\u7684 did \u4E0E\u7C73\u5BB6\u4E2D\u7684\u8BBE\u5907\u540D\u79F0\u662F\u5426\u4E00\u81F4\u3002\u6CE8\u610F\u9519\u522B\u5B57\u3001\u7A7A\u683C\u548C\u5927\u5C0F\u5199\uFF0C\u6BD4\u5982\uFF1A\u97F3\u54CD \u{1F449} \u97F3\u7BB1"
    );
    console.log(
      "\u{1F4A1} \u5EFA\u8BAE\u6253\u5F00 debug \u9009\u9879\uFF0C\u67E5\u770B\u76EE\u6807\u8BBE\u5907\u7684\u771F\u5B9E name\u3001miotDID \u6216 mac \u5730\u5740\uFF0C\u66F4\u65B0 did \u53C2\u6570"
    );
    return void 0;
  }
  console.log("\u2705 \u8BBE\u5907\u4FE1\u606F\u83B7\u53D6\u6210\u529F:", account.device?.name || account.device?.alias);
  return account;
}
function _getLoginCookies(account) {
  return {
    userId: account.userId,
    deviceId: account.deviceId,
    passToken: account.pass?.passToken,
    sdkVersion: "3.9"
  };
}
async function _getServiceToken(pass) {
  const { location, nonce, ssecurity } = pass ?? {};
  if (!location || !nonce || !ssecurity) {
    console.error("\u274C \u65E0\u6CD5\u83B7\u53D6 serviceToken\uFF0C\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570");
    return void 0;
  }
  const nsec = `nonce=${nonce}&${ssecurity}`;
  const clientSign = sha1(nsec);
  const url = location + "&clientSign=" + encodeURIComponent(clientSign);
  const res = await Http.get(url, {}, { rawResponse: true });
  const cookies = res.headers?.["set-cookie"] ?? [];
  for (const cookie of cookies) {
    const match = cookie.match(/serviceToken=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  console.error("\u274C \u83B7\u53D6 Mi Service Token \u5931\u8D25");
  return void 0;
}
export {
  getAccount
};
//# sourceMappingURL=account.js.map