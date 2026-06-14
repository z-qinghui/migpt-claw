import { readJSON, writeJSON } from "../utils/io.js";
import { getAccount } from "./account.js";
import { MiNA } from "./mina.js";
import { MIoT } from "./miot.js";
import { Debugger } from "../utils/debug.js";
const kConfigFile = ".mi.json";
function updateMiAccount(account) {
  return (updated) => {
    if (updated.serviceToken) {
      account.serviceToken = updated.serviceToken;
    }
    if (updated.deviceId) {
      account.deviceId = updated.deviceId;
    }
    if (updated.pass?.ssecurity) {
      if (!account.pass) account.pass = { code: 0 };
      account.pass.ssecurity = updated.pass.ssecurity;
    }
    if (updated.pass?.nonce) {
      if (!account.pass) account.pass = { code: 0 };
      account.pass.nonce = updated.pass.nonce;
    }
    if (updated.pass?.passToken) {
      if (!account.pass) account.pass = { code: 0 };
      account.pass.passToken = updated.pass.passToken;
    }
  };
}
async function getMiService(config) {
  const { service, relogin, ...rest } = config;
  const overrides = relogin ? {} : rest;
  if (overrides.passToken) {
    overrides.pass = {
      ...overrides.pass,
      passToken: overrides.passToken
    };
  }
  const store = await readJSON(kConfigFile) ?? {};
  let deviceId = store[service]?.deviceId;
  if (!deviceId) {
    deviceId = Array(16).fill(0).map(
      () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
    ).join("");
  }
  let account = {
    deviceId,
    ...store[service],
    ...overrides,
    sid: service === "miot" ? "xiaomiio" : "micoapi"
  };
  const cached = store[service];
  if (cached?.pass) {
    account.pass = {
      ...account.pass,
      ...cached.pass
    };
  }
  const hasPassword = !!account.userId && !!account.password;
  if (!hasPassword) {
    console.error("\u274C \u7F3A\u5C11\u5FC5\u9700\u7684\u767B\u5F55\u51ED\u8BC1\uFF1A\u9700\u8981 userId \u548C password");
    console.log("\u{1F4A1} passToken \u662F\u53EF\u9009\u7684\u8F85\u52A9\u51ED\u8BC1\uFF0C\u4E0D\u80FD\u5B8C\u5168\u66FF\u4EE3\u5BC6\u7801");
    console.log('\u{1F4A1} \u914D\u7F6E\u793A\u4F8B\uFF1A{ userId: "123", password: "xxx", passToken: "yyy" }');
    return;
  }
  const result = await getAccount(account);
  if (Debugger.debug) {
    console.log("\u{1F4A1} getAccount \u7ED3\u679C\uFF1A", { result });
  }
  if (!result?.serviceToken || !result.pass?.ssecurity) {
    return void 0;
  }
  store[service] = result;
  await writeJSON(kConfigFile, store);
  return service === "miot" ? new MIoT(result) : new MiNA(result);
}
export {
  getMiService,
  updateMiAccount
};
//# sourceMappingURL=common.js.map