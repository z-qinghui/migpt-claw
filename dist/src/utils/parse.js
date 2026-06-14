export function jsonEncode(obj, options) {
    const { prettier } = options ?? {};
    try {
        return JSON.stringify(obj, undefined, prettier ? 4 : 0);
    }
    catch (_) {
        return undefined;
    }
}
export function jsonDecode(json) {
    if (!json) {
        return undefined;
    }
    try {
        return JSON.parse(json);
    }
    catch (_) {
        return undefined;
    }
}
/**
 * 清理 JSON 字符串并解码
 */
export function cleanJsonAndDecode(input) {
    if (input == undefined)
        return undefined;
    const pattern = /(\{[\s\S]*?"\s*:\s*[\s\S]*?})/;
    const match = input.match(pattern);
    if (!match) {
        return undefined;
    }
    return jsonDecode(match[0]);
}
/**
 * 获取数组第一个元素
 */
export function firstOf(items) {
    return items ? (items.length < 1 ? undefined : items[0]) : undefined;
}
/**
 * 获取数组最后一个元素
 */
export function lastOf(items) {
    return items?.length ? items[items.length - 1] : undefined;
}
/**
 * 休眠
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * 断言
 */
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
//# sourceMappingURL=parse.js.map