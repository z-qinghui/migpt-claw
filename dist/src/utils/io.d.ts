/**
 * 获取数据目录
 */
export declare function getDataDir(subdir?: string): string;
/**
 * 读取 JSON 文件
 */
export declare function readJSON<T = any>(filename: string): Promise<T | undefined>;
/**
 * 写入 JSON 文件
 */
export declare function writeJSON(filename: string, data: any): Promise<void>;
/**
 * 检查文件是否存在
 */
export declare function fileExists(filepath: string): Promise<boolean>;
/**
 * 读取文件
 */
export declare function readFile(filepath: string): Promise<Buffer>;
/**
 * 写入文件
 */
export declare function writeFile(filepath: string, content: string | Buffer): Promise<void>;
//# sourceMappingURL=io.d.ts.map