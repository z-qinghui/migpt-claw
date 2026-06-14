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
        const mimoTTS = new MiMoTTS({
          apiKey: mimoConfig.apiKey,
          model: mimoConfig.model,
          voice: mimoConfig.voice,
          style: mimoConfig.style
        });
        await mimoTTS.init();
        MiSpeaker.setMiMoTTS(mimoTTS);
        log?.info(`[migpt:${account.accountId}] MiMo TTS \u5DF2\u542F\u7528`);
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
        const enterKeywords = cfg.channels?.migpt?.keepAliveEnterKeywords ?? ["\u6253\u5F00\u8FDE\u7EED\u5BF9\u8BDD", "\u8FDB\u5165\u6301\u7EED\u5BF9\u8BDD"];
        const exitKeywords = cfg.channels?.migpt?.keepAliveExitKeywords ?? ["\u5173\u95ED\u8FDE\u7EED\u5BF9\u8BDD", "\u9000\u51FA\u6301\u7EED\u5BF9\u8BDD", "\u518D\u89C1"];
        while (!abortSignal.aborted) {
          try {
            const msg = await MiMessage.fetchNextMessage(deviceName);
            if (msg) {
              log?.info(`[migpt:${account.accountId}] Received message from ${deviceName}: ${msg.text.slice(0, 50)}...`);
              if (enterKeywords.some((kw) => msg.text.includes(kw))) {
                enterKeepAlive();
                MiSpeaker.play({ text: "\u5DF2\u8FDB\u5165\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F\uFF0C\u8BF4\u5B8C\u540E\u6211\u4F1A\u81EA\u52A8\u7EE7\u7EED\u542C" });
                continue;
              }
              if (exitKeywords.some((kw) => msg.text.includes(kw))) {
                exitKeepAlive();
                MiSpeaker.play({ text: "\u5DF2\u9000\u51FA\u6301\u7EED\u5BF9\u8BDD\u6A21\u5F0F" });
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
              const DEFAULT_SPEAKER_PROMPT = `\u3010\u97F3\u7BB1\u64AD\u62A5\u89C4\u8303 - \u5FC5\u987B\u9075\u5B88\u3011
\u4F60\u662F\u4E00\u4E2A\u667A\u80FD\u97F3\u7BB1\u52A9\u624B\uFF0C\u901A\u8FC7\u8BED\u97F3\u4E0E\u7528\u6237\u4EA4\u6D41\u3002\u8BF7\u9075\u5B88\u4EE5\u4E0B\u89C4\u8303\uFF1A

\u{1F4E2} \u64AD\u62A5\u539F\u5219\uFF1A
1. \u7B80\u77ED\u4F18\u5148\uFF1A\u5355\u6B21\u64AD\u62A5\u63A7\u5236\u5728 100 \u5B57\u4EE5\u5185\uFF0C\u8D85\u8FC7\u8BF7\u62C6\u5206\u6216\u6539\u7528\u5176\u4ED6\u6E20\u9053
2. \u7EAF\u6587\u5B57\uFF1A\u53EA\u8F93\u51FA\u9002\u5408\u8BED\u97F3\u64AD\u62A5\u7684\u7EAF\u6587\u5B57\uFF0C\u4E0D\u8981\u5305\u542B URL\u3001\u4EE3\u7801\u3001\u590D\u6742\u683C\u5F0F
3. \u81EA\u7136\u53E3\u8BED\uFF1A\u4F7F\u7528\u7B80\u77ED\u3001\u6E05\u6670\u7684\u53E3\u8BED\u8868\u8FBE\uFF0C\u907F\u514D\u957F\u53E5\u548C\u590D\u6742\u7ED3\u6784

\u{1F6AB} \u4E0D\u9002\u5408\u64AD\u62A5\u7684\u5185\u5BB9\uFF08\u5E94\u6539\u7528\u5176\u4ED6\u6E20\u9053\uFF09\uFF1A
- \u4EE3\u7801\u7247\u6BB5\u3001\u6280\u672F\u6587\u6863
- \u957F\u7BC7\u6587\u7AE0\u3001\u62A5\u544A\uFF08>300 \u5B57\uFF09
- \u590D\u6742\u6570\u636E\u8868\u683C\u3001\u5217\u8868
- \u56FE\u7247\u3001\u89C6\u9891\u3001\u6587\u4EF6\u7B49\u591A\u5A92\u4F53\u5185\u5BB9
- URL \u94FE\u63A5\u3001\u90AE\u7BB1\u5730\u5740

\u2705 \u6B63\u786E\u505A\u6CD5\u793A\u4F8B\uFF1A
- \u77ED\u56DE\u590D\uFF1A"\u597D\u7684\uFF0C\u5DF2\u4E3A\u4F60\u8BBE\u7F6E\u660E\u5929\u65E9\u4E0A 8 \u70B9\u7684\u95F9\u949F"
- \u957F\u5185\u5BB9\u5206\u6D41\uFF1A"\u7531\u4E8E\u5185\u5BB9\u8F83\u957F\uFF0C\u8BE6\u7EC6\u62A5\u544A\u5DF2\u53D1\u9001\u5230\u4F60\u7684\u624B\u673A/\u5FAE\u4FE1\uFF0C\u8BF7\u67E5\u770B"
- \u4EE3\u7801\u573A\u666F\uFF1A"\u4EE3\u7801\u5DF2\u751F\u6210\u5E76\u53D1\u9001\u5230\u4F60\u7684\u90AE\u7BB1\uFF0C\u8BF7\u6CE8\u610F\u67E5\u6536"
- \u591A\u5A92\u4F53\u573A\u666F\uFF1A"\u8FD9\u5F20\u56FE\u7247\u5F88\u6709\u8DA3\uFF0C\u5DF2\u53D1\u9001\u5230\u4F60\u7684\u624B\u673A\u67E5\u770B"`;
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
                      await MiSpeaker.play({ text: payload.text });
                      if (keepAlive) {
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