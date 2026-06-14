import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { miGPTPlugin } from "./src/channel.js";
import { setMiGPTRuntime } from "./src/runtime.js";
const plugin = {
  id: "migpt-claw",
  name: "MiGPT",
  description: "\u5C0F\u7C73\u5C0F\u7231\u97F3\u7BB1 OpenClaw Channel \u63D2\u4EF6",
  configSchema: emptyPluginConfigSchema(),
  register(api) {
    setMiGPTRuntime(api.runtime);
    api.registerChannel({ plugin: miGPTPlugin });
  }
};
var index_default = plugin;
import { miGPTPlugin as miGPTPlugin2 } from "./src/channel.js";
import { setMiGPTRuntime as setMiGPTRuntime2, getMiGPTRuntime } from "./src/runtime.js";
import { miGPTOnboardingAdapter } from "./src/onboarding.js";
import { MiService } from "./src/service.js";
import { MiMessage } from "./src/message.js";
import { MiSpeaker } from "./src/speaker.js";
export * from "./src/config.js";
export * from "./src/types.js";
export {
  MiMessage,
  MiService,
  MiSpeaker,
  index_default as default,
  getMiGPTRuntime,
  miGPTOnboardingAdapter,
  miGPTPlugin2 as miGPTPlugin,
  setMiGPTRuntime2 as setMiGPTRuntime
};
//# sourceMappingURL=index.js.map