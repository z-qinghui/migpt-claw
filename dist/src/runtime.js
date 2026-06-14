let runtime = null;
function setMiGPTRuntime(next) {
  runtime = next;
}
function getMiGPTRuntime() {
  if (!runtime) {
    throw new Error("MiGPT runtime not initialized");
  }
  return runtime;
}
export {
  getMiGPTRuntime,
  setMiGPTRuntime
};
//# sourceMappingURL=runtime.js.map