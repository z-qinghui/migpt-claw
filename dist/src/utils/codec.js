import { jsonDecode } from "./parse.js";
import * as pako from "pako";
import { randomNoise, signNonce } from "./hash.js";
import { createHmac } from "crypto";
import { Debugger } from "./debug.js";
function parseAuthPass(res) {
  try {
    return jsonDecode(
      res.replace("&&&START&&&", "").replace(/:(\d{9,})/g, ':"$1"')
      // 把 userId 和 nonce 转成 string
    ) ?? {};
  } catch {
    return {};
  }
}
function encodeQuery(data) {
  return Object.entries(data).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value == null ? "" : value.toString())}`
  ).join("&");
}
function decodeQuery(str) {
  const data = {};
  if (!str) {
    return data;
  }
  const ss = str.split("&");
  for (let i = 0; i < ss.length; i++) {
    const s = ss[i].split("=");
    if (s.length != 2) {
      continue;
    }
    const k = decodeURIComponent(s[0]);
    let v = decodeURIComponent(s[1]);
    if (/^\[{/.test(v)) {
      try {
        v = jsonDecode(v);
      } catch {
      }
    }
    data[k] = v;
  }
  return data;
}
function encodeFormData(data) {
  return Object.entries(data).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
}
class RC4 {
  i = 0;
  j = 0;
  S;
  constructor(key) {
    this.S = Buffer.alloc(256);
    for (let idx = 0; idx < 256; idx++) {
      this.S[idx] = idx;
    }
    let j = 0;
    for (let idx = 0; idx < 256; idx++) {
      j = j + this.S[idx] + key[idx % key.length] & 255;
      [this.S[idx], this.S[j]] = [this.S[j], this.S[idx]];
    }
  }
  update(data) {
    const result = Buffer.alloc(data.length);
    for (let n = 0; n < data.length; n++) {
      this.i = this.i + 1 & 255;
      this.j = this.j + this.S[this.i] & 255;
      [this.S[this.i], this.S[this.j]] = [this.S[this.j], this.S[this.i]];
      const K = this.S[this.S[this.i] + this.S[this.j] & 255];
      result[n] = data[n] ^ K;
    }
    return result;
  }
}
function signMIoT(uri, snonce, nonce, data) {
  const msg = `${uri}&${snonce}&${nonce}&data=${data}`;
  const key = Buffer.from(snonce, "base64");
  return createHmac("sha256", key).update(msg).digest("base64");
}
function encodeMIoT(uri, data, ssecurity) {
  const nonce = randomNoise();
  const snonce = signNonce(ssecurity, nonce);
  const json = JSON.stringify(data).replace(/:/g, ": ").replace(/,/g, ", ");
  const signature = signMIoT(uri, snonce, nonce, json);
  if (Debugger.debug) {
    console.log("encodeMIoT \u7B7E\u540D\u8BE6\u60C5:", {
      uri,
      ssecurity: ssecurity.slice(0, 20) + "...",
      nonce,
      snonce,
      json,
      signature,
      signMsg: `${uri}&${snonce}&${nonce}&data=${json}`
    });
  }
  return {
    _nonce: nonce,
    data: json,
    signature
  };
}
function decodeMIoT(ssecurity, nonce, data, gzip) {
  try {
    const res2 = jsonDecode(data);
    if (res2) {
      return Promise.resolve(res2);
    }
  } catch {
  }
  let decrypted;
  try {
    const key = Buffer.from(signNonce(ssecurity, nonce), "base64");
    const rc4 = new RC4(key);
    rc4.update(Buffer.alloc(1024));
    decrypted = Buffer.from(rc4.update(Buffer.from(data, "base64")));
    if (gzip) {
      try {
        decrypted = Buffer.from(pako.ungzip(decrypted));
      } catch (err) {
      }
    }
  } catch {
    decrypted = Buffer.from(data, "base64");
    if (gzip) {
      try {
        decrypted = Buffer.from(pako.ungzip(decrypted));
      } catch (err) {
      }
    }
  }
  const res = jsonDecode(decrypted.toString());
  if (!res) {
    console.error("\u274C decodeMIoT failed");
  }
  return Promise.resolve(res);
}
export {
  decodeMIoT,
  decodeQuery,
  encodeFormData,
  encodeMIoT,
  encodeQuery,
  parseAuthPass
};
//# sourceMappingURL=codec.js.map