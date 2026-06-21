import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import {
  resolveMiAccount,
  listMiAccountIds,
  resolveDefaultMiAccountId,
  setMiAccountEnabled,
  deleteMiAccount,
  resolveMiAllowFrom,
  formatMiAllowFrom
} from "./config.js";
import { miOutbound } from "./outbound.js";
import { miGPTOnboardingAdapter } from "./onboarding.js";
import { MiService } from "./service.js";
import { MiMessage } from "./message.js";
import { sleep } from "./utils/parse.js";
import { Debugger } from "./utils/debug.js";
import { MiSpeaker } from "./speaker.js";
import { getMiGPTRuntime } from "./runtime.js";
import { MiMoTTS } from "./tts/mimo.js";
const meta = {
  id: "migpt",
  label: "MiGPT",
  selectionLabel: "\u5C0F\u7C73\u97F3\u7BB1 (MiGPT)",
  docsPath: "/channels/migpt",
  docsLabel: "migpt",
  blurb: "\u5C0F\u7C73\u5C0F\u7231\u97F3\u7BB1\u8BED\u97F3\u5BF9\u8BDD\u3002",
  aliases: ["xiaomi", "mico"],
  order: 60
};
const miGPTPlugin = {
  id: "migpt",
  meta: {
    ...meta
  },
  capabilities: {
    chatTypes: ["direct"],
    polls: false,
    threads: false,
    media: true,
    reactions: false,
    edit: false,
    reply: false,
    blockStreaming: false
  },
  reload: { configPrefixes: ["channels.migpt"] },
  onboarding: miGPTOnboardingAdapter,
  // 新增：Agent Prompt 配置，用于定制 AI 在音箱场景下的行为规范
  agentPrompt: {
    description: "\u97F3\u7BB1\u64AD\u62A5\u89C4\u8303",
    getConfig: (cfg) => {
      const migptCfg = cfg.channels?.migpt;
      return {
        enabled: true,
        systemPrompt: migptCfg?.systemPrompt
      };
    },
    applyConfig: (cfg, updates) => {
      const nextCfg = { ...cfg };
      const nextMigpt = { ...nextCfg.channels?.migpt };
      if (updates.systemPrompt !== void 0) {
        nextMigpt.systemPrompt = updates.systemPrompt;
      }
      nextCfg.channels = { ...nextCfg.channels, migpt: nextMigpt };
      return nextCfg;
    }
  },
  config: {
    listAccountIds: (cfg) => listMiAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveMiAccount(cfg, accountId),
    defaultAccountId: (cfg) => resolveDefaultMiAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) => setMiAccountEnabled(cfg, accountId, enabled),
    deleteAccount: ({ cfg, accountId }) => deleteMiAccount(cfg, accountId),
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      name: account.name,
      devices: account.devices
    }),
    resolveAllowFrom: ({ cfg, accountId }) => resolveMiAllowFrom(cfg, accountId),
    formatAllowFrom: ({ allowFrom }) => formatMiAllowFrom(allowFrom)
  },
  setup: {
    resolveAccountId: ({ accountId }) => accountId?.trim().toLowerCase() || DEFAULT_ACCOUNT_ID,
    applyAccountConfig: ({ cfg, accountId, input }) => {
      const migptCfg = cfg.channels?.migpt ?? {};
      const accountConfig = {
        userId: input.userId,
        password: input.password,
        passToken: input.passToken,
        devices: input.devices,
        enabled: true
      };
      const isDefault = !accountId || accountId === DEFAULT_ACCOUNT_ID;
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
    },
    validateInput: ({ input }) => {
      if (!input.userId) {
        return "\u5C0F\u7C73 ID (userId) \u662F\u5FC5\u9700\u7684";
      }
      if (!input.passToken && !input.password) {
        return "\u9700\u8981\u63D0\u4F9B passToken \u6216 password";
      }
      return null;
    }
  },
  messaging: {
    normalizeTarget: (target) => {
      let id = target.replace(/^migpt:/i, "");
      if (id.trim()) {
        return { ok: true, to: id.trim() };
      }
      return { ok: false, error: "Invalid target format" };
    },
    targetResolver: {
      looksLikeId: (id) => {
        return id.length > 0 && id.length < 100;
      },
      hint: "MiGPT \u76EE\u6807\u683C\u5F0F\uFF1A\u8BBE\u5907\u540D\u79F0\uFF08\u5982\uFF1A\u5BA2\u5385\u97F3\u7BB1\uFF09"
    }
  },
  outbound: miOutbound,
  gateway: {
    startAccount: async (ctx) => {
      const { account, abortSignal, log, cfg } = ctx;
      log?.info(`[migpt:${account.accountId}] Starting gateway`);
      if (!account.configured) {
        log?.error(`[migpt:${account.accountId}] Account not configured`);
        return;
      }
      const devices = account.devices;
      if (devices.length === 0) {
        log?.error(`[migpt:${account.accountId}] No devices configured`);
        return;
      }
      const mimoConfig = cfg.channels?.migpt?.mimo;
      if (mimoConfig?.apiKey) {
        await MiSpeaker.cleanupMiMoTTS();
        const mimoTTS = new MiMoTTS({
          apiKey: mimoConfig.apiKey,
          baseUrl: mimoConfig.baseUrl,
          model: mimoConfig.model,
          voice: mimoConfig.voice,
          style: mimoConfig.style,
          stream: mimoConfig.stream,
          port: mimoConfig.port,
          host: mimoConfig.host
        });
        await mimoTTS.init();
        await MiSpeaker.setMiMoTTS(mimoTTS);
        log?.info(`[migpt:${account.accountId}] MiMo TTS \u5DF2\u542F\u7528 (server: ${mimoTTS.serverUrl})`);
      }
      const keepAliveTimeout = cfg.channels?.migpt?.keepAliveTimeout ?? 30;
      let keepAlive = cfg.channels?.migpt?.keepAlive ?? false;
      let keepAliveTimer = null;
      const resetKeepAliveTimer = () => {
        if (keepAliveTimer) clearTimeout(keepAliveTimer);
        if (keepAlive) {
          keepAliveTimer = setTimeout(() => {
            keepAlive = false;
            log?.info(`[migpt:${account.accountId}] \u6301\u7EED\u5BF9\u8BDD\u8D85\u65F6 (${keepAliveTimeout}s)\uFF0C\u9000\u51FA`);
          }, keepAliveTimeout * 1e3);
        }
      };
      const enterKeepAlive = () => {
        keepAlive = true;
        resetKeepAliveTimer();
        log?.info(`[migpt:${account.accountId}] \u8FDB\u5165\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F`);
      };
      const exitKeepAlive = () => {
        keepAlive = false;
        if (keepAliveTimer) {
          clearTimeout(keepAliveTimer);
          keepAliveTimer = null;
        }
        log?.info(`[migpt:${account.accountId}] \u9000\u51FA\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F`);
      };
      const devicePromises = devices.map(async (deviceName) => {
        log?.info(`[migpt:${account.accountId}] Starting poller for device: ${deviceName}`);
        const initSuccess = await MiService.init({
          ...account.config,
          announceOnStart: account.config.announceOnStart ?? cfg.channels?.migpt?.announceOnStart,
          startupMessage: account.config.startupMessage ?? cfg.channels?.migpt?.startupMessage
        }, deviceName);
        if (!initSuccess) {
          log?.error(`[migpt:${account.accountId}] Failed to initialize device: ${deviceName}`);
          return;
        }
        Debugger.debug = account.config.debug ?? false;
        ctx.setStatus({
          ...ctx.getStatus(),
          running: true,
          connected: true,
          lastConnectedAt: Date.now()
        });
        const heartbeat = cfg.channels?.migpt?.heartbeat ?? 1e3;
        const enterKeywords = cfg.channels?.migpt?.keepAliveEnterKeywords ?? ["\u6253\u5F00\u8FDE\u7EED\u5BF9\u8BDD", "\u8FDB\u5165\u6301\u7EED\u5BF9\u8BDD", "\u5F00\u542F\u6301\u7EED\u5BF9\u8BDD", "\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F"];
        const exitKeywords = cfg.channels?.migpt?.keepAliveExitKeywords ?? ["\u5173\u95ED\u8FDE\u7EED\u5BF9\u8BDD", "\u9000\u51FA\u6301\u7EED\u5BF9\u8BDD", "\u9000\u51FA\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F", "\u518D\u89C1"];
        while (!abortSignal.aborted) {
          try {
            const msg = await MiMessage.fetchNextMessage(deviceName);
            if (msg) {
              log?.info(`[migpt:${account.accountId}] Received message from ${deviceName}: ${msg.text.slice(0, 50)}...`);
              if (enterKeywords.some((kw) => msg.text.includes(kw))) {
                enterKeepAlive();
                const enterResult = await MiSpeaker.play({ text: "\u5DF2\u8FDB\u5165\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F" });
                const waitMs = enterResult.duration ? Math.ceil(enterResult.duration * 1e3) + 200 : 4e3;
                log?.info(`[migpt:${account.accountId}] \u7B49\u5F85\u97F3\u9891\u64AD\u653E\u5B8C\u6210: ${waitMs}ms`);
                await sleep(waitMs);
                await MiService.wakeUp();
                log?.info(`[migpt:${account.accountId}] \u6301\u7EED\u5BF9\u8BDD\uFF1A\u5DF2\u5524\u9192\u97F3\u7BB1\u7B49\u5F85\u4E0B\u4E00\u53E5`);
                continue;
              }
              if (exitKeywords.some((kw) => msg.text.includes(kw))) {
                exitKeepAlive();
                await MiSpeaker.play({ text: "\u5DF2\u9000\u51FA\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F" });
                continue;
              }
              const keepAliveKeywords = [...enterKeywords, ...exitKeywords];
              if (keepAliveKeywords.some((kw) => msg.text.includes(kw))) {
                log?.info(`[migpt:${account.accountId}] \u8C41\u514D\u6301\u7EED\u5BF9\u8BDD\u6307\u4EE4: ${msg.text.slice(0, 30)}...`);
                continue;
              }
              const hardwareControlVerbs = cfg.channels?.migpt?.hardwareControlVerbs ?? [
                "\u64AD\u653E",
                "\u6253\u5F00",
                "\u5173\u95ED",
                "\u6682\u505C",
                "\u7EE7\u7EED",
                "\u505C\u6B62",
                "\u5207\u6362",
                "\u5F00\u542F",
                "\u5173\u6389",
                "\u5F00",
                "\u5173",
                "\u542F\u52A8",
                "\u8C03\u8282",
                "\u8C03\u9AD8",
                "\u8C03\u4F4E",
                "\u8C03\u5927",
                "\u8C03\u5C0F",
                "\u8C03\u4EAE",
                "\u8C03\u6697",
                "\u589E\u5927",
                "\u51CF\u5C0F",
                "\u8BBE\u7F6E",
                "\u8C03\u5230",
                "\u5BFC\u822A",
                "\u62E8\u6253",
                "\u6253\u7535\u8BDD",
                "\u547C\u53EB",
                "\u53D1\u77ED\u4FE1",
                "\u53D1\u6D88\u606F"
              ];
              const hardwareControlPattern = new RegExp(
                `^((${hardwareControlVerbs.join("|")})|.+(${hardwareControlVerbs.join("|")})).+`
              );
              const isHardwareControl = hardwareControlPattern.test(msg.text.trim());
              if (isHardwareControl) {
                log?.info(`[migpt:${account.accountId}] \u8DF3\u8FC7\u786C\u4EF6\u63A7\u5236\u6307\u4EE4: ${msg.text.slice(0, 30)}...`);
                continue;
              }
              try {
                await MiSpeaker.pause();
              } catch {
              }
              if (keepAlive) {
                resetKeepAliveTimer();
              }
              const pluginRuntime = getMiGPTRuntime();
              pluginRuntime.channel.activity.record({
                channel: "migpt",
                accountId: account.accountId,
                direction: "inbound"
              });
              const fromAddress = `migpt:${deviceName}`;
              const toAddress = `migpt:${account.accountId}`;
              const sessionKey = `${account.accountId}:${deviceName}`;
              const systemPrompts = [];
              if (account.config.systemPrompt) {
                systemPrompts.push(account.config.systemPrompt);
              }
              const globalSystemPrompt = cfg.channels?.migpt?.systemPrompt;
              if (globalSystemPrompt && globalSystemPrompt !== account.config.systemPrompt) {
                systemPrompts.push(globalSystemPrompt);
              }
              const envelopeOptions = pluginRuntime.channel.reply.resolveEnvelopeFormatOptions(cfg);
              const body = pluginRuntime.channel.reply.formatInboundEnvelope({
                Body: msg.text,
                BodyForAgent: msg.text,
                From: fromAddress,
                To: toAddress,
                SessionKey: sessionKey,
                ChatType: "direct",
                SenderId: deviceName,
                SenderName: deviceName,
                Provider: "migpt",
                Surface: "migpt",
                MessageSid: `${deviceName}-${msg.timestamp}`,
                Timestamp: msg.timestamp,
                OriginatingChannel: "migpt",
                envelopeOptions
              });
              const DEFAULT_SPEAKER_PROMPT = `\u4F60\u662F\u5C0F\u7C73\u667A\u80FD\u97F3\u7BB1\u52A9\u624B\uFF0C\u7528\u7B80\u77ED\u53E3\u8BED\u56DE\u590D\u3002\u89C4\u5219\uFF1A\u666E\u901A\u5BF9\u8BDD\u56DE\u590D 50 \u5B57\u4EE5\u5185\uFF0C\u8BB2\u6545\u4E8B\u6216\u67E5\u8D44\u6599\u53EF\u4EE5\u9002\u5F53\u653E\u5BBD\u9650\u5236\u4E0D\u8D85\u8FC7 200 \u5B57\uFF1B\u4E0D\u7528 URL/\u4EE3\u7801/emoji/markdown \u683C\u5F0F\u3002`;
              const contextInfo = `\u4F60\u6B63\u5728\u901A\u8FC7\u5C0F\u7C73\u97F3\u7BB1\u4E0E\u7528\u6237\u5BF9\u8BDD\u3002

\u3010\u4F1A\u8BDD\u4E0A\u4E0B\u6587\u3011
- \u8BBE\u5907\uFF1A${deviceName}
- \u7528\u6237\uFF1A${deviceName}
- \u6D88\u606F ID: ${deviceName}-${msg.timestamp}
- \u5F53\u524D\u65F6\u95F4\uFF1A${new Date(msg.timestamp).toLocaleString("zh-CN")}`;
              const agentBody = systemPrompts.length > 0 ? `${contextInfo}

${systemPrompts.join("\n\n")}

${msg.text}` : `${contextInfo}

${DEFAULT_SPEAKER_PROMPT}

${msg.text}`;
              const ctxPayload = pluginRuntime.channel.reply.finalizeInboundContext({
                Body: body,
                BodyForAgent: agentBody,
                RawBody: msg.text,
                CommandBody: msg.text,
                From: fromAddress,
                To: toAddress,
                SessionKey: sessionKey,
                AccountId: account.accountId,
                ChatType: "direct",
                SenderId: deviceName,
                SenderName: deviceName,
                Provider: "migpt",
                Surface: "migpt",
                MessageSid: `${deviceName}-${msg.timestamp}`,
                Timestamp: msg.timestamp,
                OriginatingChannel: "migpt",
                OriginatingTo: toAddress,
                CommandAuthorized: true
              });
              await pluginRuntime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
                ctx: ctxPayload,
                cfg,
                dispatcherOptions: {
                  responsePrefix: "",
                  deliver: async (payload, info) => {
                    log?.info(`[migpt:${account.accountId}] deliver called, kind: ${info.kind}`);
                    if (payload.text) {
                      const playResult = await MiSpeaker.play({ text: payload.text });
                      const exitKeywordsInReply = ["\u9000\u51FA", "\u5173\u95ED", "\u518D\u89C1", "\u5DF2\u9000\u51FA", "\u5DF2\u5173\u95ED"];
                      if (exitKeywordsInReply.some((kw) => payload.text.includes(kw))) {
                        exitKeepAlive();
                        log?.info(`[migpt:${account.accountId}] AI \u56DE\u590D\u5305\u542B\u9000\u51FA\u5173\u952E\u8BCD\uFF0C\u9000\u51FA\u6301\u7EED\u5BF9\u8BDD`);
                      }
                      if (keepAlive) {
                        const waitMs = playResult.duration ? Math.ceil(playResult.duration * 1e3) + 200 : 2e3;
                        log?.info(`[migpt:${account.accountId}] \u7B49\u5F85\u97F3\u9891\u64AD\u653E\u5B8C\u6210: ${waitMs}ms`);
                        await sleep(waitMs);
                        await MiService.wakeUp();
                        log?.info(`[migpt:${account.accountId}] \u6301\u7EED\u5BF9\u8BDD\uFF1A\u5DF2\u5524\u9192\u97F3\u7BB1\u7B49\u5F85\u4E0B\u4E00\u53E5`);
                      }
                    }
                  }
                }
              });
            }
          } catch (err) {
            log?.error(`[migpt:${account.accountId}] Error polling messages: ${err.message}`);
            ctx.setStatus({
              ...ctx.getStatus(),
              lastError: err.message
            });
          }
          await sleep(heartbeat);
        }
        log?.info(`[migpt:${account.accountId}] Stopping poller for device: ${deviceName}`);
      });
      await Promise.all(devicePromises);
      if (keepAliveTimer) {
        clearTimeout(keepAliveTimer);
      }
    }
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      connected: false,
      lastConnectedAt: null,
      lastError: null,
      lastInboundAt: null,
      lastOutboundAt: null
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      connected: snapshot.connected ?? false,
      lastConnectedAt: snapshot.lastConnectedAt ?? null,
      lastError: snapshot.lastError ?? null
    }),
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account?.accountId ?? DEFAULT_ACCOUNT_ID,
      name: account?.name,
      enabled: account?.enabled ?? false,
      configured: Boolean(account?.configured),
      devices: account?.devices,
      running: runtime?.running ?? false,
      connected: runtime?.connected ?? false,
      lastConnectedAt: runtime?.lastConnectedAt ?? null,
      lastError: runtime?.lastError ?? null,
      lastInboundAt: runtime?.lastInboundAt ?? null,
      lastOutboundAt: runtime?.lastOutboundAt ?? null
    })
  }
};
export {
  miGPTPlugin
};
//# sourceMappingURL=channel.js.map