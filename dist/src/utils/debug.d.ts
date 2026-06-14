/**
 * 调试工具
 */
declare class Debugger {
    static debug: boolean;
    static log(...args: any[]): void;
    static error(...args: any[]): void;
}

export { Debugger };
