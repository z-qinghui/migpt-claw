function jsonEncode(obj, options) {
  const { prettier } = options ?? {};
  try {
    return JSON.stringify(obj, void 0, prettier ? 4 : 0);
  } catch (_) {
    return void 0;
  }
}
function jsonDecode(json) {
  if (!json) {
    return void 0;
  }
  try {
    return JSON.parse(json);
  } catch (_) {
    return void 0;
  }
}
function cleanJsonAndDecode(input) {
  if (input == void 0) return void 0;
  const pattern = /(\{[\s\S]*?"\s*:\s*[\s\S]*?})/;
  const match = input.match(pattern);
  if (!match) {
    return void 0;
  }
  return jsonDecode(match[0]);
}
function firstOf(items) {
  return items ? items.length < 1 ? void 0 : items[0] : void 0;
}
function lastOf(items) {
  return items?.length ? items[items.length - 1] : void 0;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
export {
  assert,
  cleanJsonAndDecode,
  firstOf,
  jsonDecode,
  jsonEncode,
  lastOf,
  sleep
};
//# sourceMappingURL=parse.js.map