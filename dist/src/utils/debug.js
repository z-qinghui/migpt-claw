/**
 * 调试工具
 */
export class Debugger {
    static debug = false;
    static log(...args) {
        if (this.debug) {
            console.log('[MiGPT]', ...args);
        }
    }
    static error(...args) {
        console.error('[MiGPT]', ...args);
    }
}
//# sourceMappingURL=debug.js.map