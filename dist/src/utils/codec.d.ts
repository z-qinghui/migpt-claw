import type { MiPass } from '../mi/typing.js';
/**
 * 解析登录响应中的认证参数
 * 参考 migpt-next 实现
 */
export declare function parseAuthPass(res: string): Partial<{
    code: number;
    description: string;
    captchaUrl: string;
    notificationUrl: string;
} & MiPass>;
export declare function encodeQuery(data: Record<string, string | number | boolean | undefined>): string;
export declare function decodeQuery(str: string): any;
/**
 * URL 编码对象为 form 格式
 */
export declare function encodeFormData(data: Record<string, any>): string;
interface MIoTRequest {
    data: string;
    signature: string;
    _nonce: string;
}
/**
 * MIoT 请求编码 - 参考 MiService sign_data
 * 只签名，不加密数据
 */
export declare function encodeMIoT(uri: string, data: any, ssecurity: string): MIoTRequest;
export declare function decodeMIoT(ssecurity: string, nonce: string, data: string, gzip?: boolean): Promise<any | undefined>;
export {};
//# sourceMappingURL=codec.d.ts.map