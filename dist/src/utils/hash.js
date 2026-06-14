import * as crypto from "node:crypto";
function md5(data) {
  return crypto.createHash("md5").update(data).digest("hex");
}
function sha1(data) {
  return crypto.createHash("sha1").update(data).digest("base64");
}
function sha256(snonce, msg) {
  return crypto.createHmac("sha256", Buffer.from(snonce, "base64")).update(msg).digest("base64");
}
function signNonce(ssecurity, nonce) {
  const m = crypto.createHash("sha256");
  m.update(ssecurity, "base64");
  m.update(nonce, "base64");
  return m.digest().toString("base64");
}
function uuid() {
  return crypto.randomUUID();
}
function randomString(len) {
  if (len < 1) return "";
  const s = Math.random().toString(36).slice(2);
  return s + randomString(len - s.length);
}
function randomNoise() {
  const randomBytes = crypto.randomBytes(8);
  const timeInMinutes = Math.floor(Date.now() / 1e3 / 60);
  const timeBuffer = Buffer.alloc(4);
  timeBuffer.writeUInt32BE(timeInMinutes >>> 0, 0);
  return Buffer.concat([randomBytes, timeBuffer]).toString("base64");
}
function rc4Encrypt(key, data) {
  const ksa = (key2) => {
    const S2 = new Array(256);
    for (let i = 0; i < 256; i++) {
      S2[i] = i;
    }
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = j + S2[i] + key2[i % key2.length] & 255;
      [S2[i], S2[j]] = [S2[j], S2[i]];
    }
    return S2;
  };
  const prga = (S2, data2) => {
    const result = Buffer.alloc(data2.length);
    let i = 0;
    let j = 0;
    for (let n = 0; n < data2.length; n++) {
      i = i + 1 & 255;
      j = j + S2[i] & 255;
      [S2[i], S2[j]] = [S2[j], S2[i]];
      const K = S2[S2[i] + S2[j] & 255];
      result[n] = data2[n] ^ K;
    }
    return result;
  };
  const S = ksa(key);
  return prga(S, data);
}
function rc4Decrypt(key, data) {
  return rc4Encrypt(key, data);
}
export {
  md5,
  randomNoise,
  randomString,
  rc4Decrypt,
  rc4Encrypt,
  sha1,
  sha256,
  signNonce,
  uuid
};
//# sourceMappingURL=hash.js.map