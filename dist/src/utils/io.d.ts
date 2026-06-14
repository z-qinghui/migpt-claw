/**
 * 获取数据目录
 */
declare function getDataDir(subdir?: string): string;
/**
 * 读取 JSON 文件
 */
declare function readJSON<T = any>(filename: string): Promise<T | undefined>;
/**
 * 写入 JSON 文件
 */
declare function writeJSON(filename: string, data: any): Promise<void>;
/**
 * 检查文件是否存在
 */
declare function fileExists(filepath: string): Promise<boolean>;
/**
 * 读取文件
 */
declare function readFile(filepath: string): Promise<Buffer>;
/**
 * 写入文件
 */
declare function writeFile(filepath: string, content: string | Buffer): Promise<void>;

export { fileExists, getDataDir, readFile, readJSON, writeFile, writeJSON };
