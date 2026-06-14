class Debugger {
  static debug = false;
  static log(...args) {
    if (this.debug) {
      console.log("[MiGPT]", ...args);
    }
  }
  static error(...args) {
    console.error("[MiGPT]", ...args);
  }
}
export {
  Debugger
};
//# sourceMappingURL=debug.js.map