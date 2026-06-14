import { MiService } from "./service.js";
const miGPTOnboardingAdapter = {
  async selectAccount({ accounts }) {
    if (accounts.length === 0) {
      return { action: "create" };
    }
    if (accounts.length === 1) {
      return { action: "use", accountId: accounts[0] };
    }
    return { action: "select" };
  },
  async promptCredentials() {
    const answers = {};
    answers.userId = await this.prompt.input({
      message: "\u8BF7\u8F93\u5165\u4F60\u7684\u5C0F\u7C73 ID\uFF08\u6570\u5B57\uFF0C\u5728\u5C0F\u7C73\u8D26\u53F7\u300C\u4E2A\u4EBA\u4FE1\u606F\u300D-\u300C\u5C0F\u7C73 ID\u300D\u67E5\u770B\uFF09:",
      validate: (v) => /^\d+$/.test(v) || "\u5C0F\u7C73 ID \u5FC5\u987B\u662F\u6570\u5B57"
    });
    const usePassToken = await this.prompt.confirm({
      message: "\u662F\u5426\u4F7F\u7528 passToken \u767B\u5F55\uFF1F\uFF08\u63A8\u8350\uFF0C\u53EF\u907F\u514D\u9A8C\u8BC1\u7801\uFF09",
      initial: false
    });
    if (usePassToken) {
      answers.passToken = await this.prompt.password({
        message: "\u8BF7\u8F93\u5165 passToken:",
        validate: (v) => !!v || "passToken \u4E0D\u80FD\u4E3A\u7A7A"
      });
    } else {
      answers.password = await this.prompt.password({
        message: "\u8BF7\u8F93\u5165\u5C0F\u7C73\u8D26\u53F7\u5BC6\u7801:",
        validate: (v) => !!v || "\u5BC6\u7801\u4E0D\u80FD\u4E3A\u7A7A"
      });
    }
    answers.deviceName = await this.prompt.input({
      message: "\u8BF7\u8F93\u5165\u5C0F\u7231\u97F3\u7BB1\u5728\u7C73\u5BB6\u4E2D\u8BBE\u7F6E\u7684\u540D\u79F0\uFF08\u5982\uFF1A\u5BA2\u5385\u97F3\u7BB1\uFF09:",
      validate: (v) => !!v || "\u8BBE\u5907\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A"
    });
    return answers;
  },
  async validateCredentials({ input }) {
    const config = {
      userId: input.userId,
      password: input.password,
      passToken: input.passToken,
      debug: true
    };
    try {
      const devices = await MiService.getDevices(config);
      if (devices.length === 0) {
        return {
          valid: false,
          error: "\u672A\u627E\u5230\u4EFB\u4F55\u8BBE\u5907\uFF0C\u8BF7\u68C0\u67E5\u8D26\u53F7\u51ED\u8BC1\u662F\u5426\u6B63\u786E"
        };
      }
      const deviceName = input.deviceName;
      const matchedDevice = devices.find(
        (d) => d.name.toLowerCase() === deviceName.toLowerCase() || d.did.toLowerCase() === deviceName.toLowerCase()
      );
      if (!matchedDevice) {
        const deviceList = devices.map((d) => d.name).join(", ");
        return {
          valid: false,
          error: `\u672A\u627E\u5230\u8BBE\u5907 "${deviceName}"\u3002\u53EF\u7528\u8BBE\u5907\uFF1A${deviceList}`
        };
      }
      return {
        valid: true,
        data: {
          did: matchedDevice.did
        }
      };
    } catch (err) {
      return {
        valid: false,
        error: err.message || "\u9A8C\u8BC1\u5931\u8D25"
      };
    }
  },
  applyConfig({ cfg, accountId, input, validatedData }) {
    const migptCfg = cfg.channels?.migpt ?? {};
    const accountConfig = {
      userId: input.userId,
      password: input.password,
      passToken: input.passToken,
      devices: [validatedData?.did || input.deviceName],
      enabled: true
    };
    const isDefault = !accountId || accountId === "main";
    if (isDefault) {
      return {
        ...cfg,
        channels: {
          ...cfg.channels,
          migpt: {
            ...migptCfg,
            ...accountConfig
          }
        }
      };
    }
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        migpt: {
          ...migptCfg,
          accounts: {
            ...migptCfg.accounts,
            [accountId]: accountConfig
          }
        }
      }
    };
  }
};
export {
  miGPTOnboardingAdapter
};
//# sourceMappingURL=onboarding.js.map