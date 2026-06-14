export declare function jsonEncode<T>(obj: T, options?: {
    prettier?: boolean;
}): string | undefined;
export declare function jsonDecode<T = any>(json: string | null | undefined): T | undefined;
/**
 * 清理 JSON 字符串并解码
 */
export declare function cleanJsonAndDecode(input: string | undefined | null): any;
/**
 * 获取数组第一个元素
 */
export declare function firstOf<T>(items?: T[]): T | undefined;
/**
 * 获取数组最后一个元素
 */
export declare function lastOf<T>(items?: T[]): T | undefined;
/**
 * 休眠
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * 断言
 */
export declare function assert(condition: boolean, message: string): asserts condition;
//# sourceMappingURL=parse.d.ts.map