let runtime = null;
export function setMiGPTRuntime(next) {
    runtime = next;
}
export function getMiGPTRuntime() {
    if (!runtime) {
        throw new Error("MiGPT runtime not initialized");
    }
    return runtime;
}
//# sourceMappingURL=runtime.js.map