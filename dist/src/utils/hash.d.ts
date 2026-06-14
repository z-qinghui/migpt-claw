/**
 * MD5 哈希
 */
declare function md5(data: string | Buffer): string;
/**
 * SHA1 哈希
 */
declare function sha1(data: string | Buffer): string;
/**
 * SHA256 HMAC
 */
declare function sha256(snonce: string, msg: string): string;
/**
 * 签名 nonce（用于 MIoT）
 * 参考 migpt-next 实现
 */
declare function signNonce(ssecurity: string, nonce: string): string;
/**
 * 生成 UUID
 */
declare function uuid(): string;
/**
 * 生成随机字符串
 */
declare function randomString(len: number): string;
/**
 * 生成随机噪声（用于 MIoT nonce）
 * 参考 MiService Python 实现：urandom(8) + int(time.time() / 60).to_bytes(4, "big")
 */
declare function randomNoise(): string;
/**
 * RC4 加密
 */
declare function rc4Encrypt(key: Buffer, data: Buffer): Buffer;
/**
 * RC4 解密（与加密相同）
 */
declare function rc4Decrypt(key: Buffer, data: Buffer): Buffer;

export { md5, randomNoise, randomString, rc4Decrypt, rc4Encrypt, sha1, sha256, signNonce, uuid };
