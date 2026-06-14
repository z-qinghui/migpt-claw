import type { MiAccount } from '../mi/typing.js';
interface HttpError {
    isError: true;
    error: any;
    code: string;
    message: string;
}
type RequestConfig = any & {
    account?: MiAccount;
    setAccount?: (newAccount: any) => void;
    rawResponse?: boolean;
    cookies?: Record<string, string | number | boolean | undefined>;
};
declare class HTTPClient {
    timeout: number;
    get<T = any>(url: string, _query?: Record<string, string | number | boolean | undefined> | RequestConfig, _config?: RequestConfig): Promise<T | HttpError>;
    post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T | HttpError>;
    static buildURL: (url: string, query?: Record<string, any>) => string;
    static buildConfig: (config?: RequestConfig) => any;
}
export declare const Http: HTTPClient;
export {};
//# sourceMappingURL=http.d.ts.map