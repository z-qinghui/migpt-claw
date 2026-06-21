import type { ChannelPlugin } from 'openclaw/plugin-sdk';
import { DEFAULT_ACCOUNT_ID } from 'openclaw/plugin-sdk';
import type { ResolvedMiAccount, ExtendedOpenClawConfig } from './types.js';
import {
  resolveMiAccount,
  listMiAccountIds,
  resolveDefaultMiAccountId,
  setMiAccountEnabled,
  deleteMiAccount,
  resolveMiAllowFrom,
  formatMiAllowFrom,
} from './config.js';
import { miOutbound } from './outbound.js';
import { miGPTOnboardingAdapter } from './onboarding.js';
import { MiService } from './service.js';
import { MiMessage } from './message.js';
import { sleep } from './utils/parse.js';
import { Debugger } from './utils/debug.js';
import { MiSpeaker } from './speaker.js';
import { getMiGPTRuntime } from './runtime.js';
import { MiMoTTS } from './tts/mimo.js';

const meta = {
  id: 'migpt',
  label: 'MiGPT',
  selectionLabel: '小米音箱 (MiGPT)',
  docsPath: '/channels/migpt',
  docsLabel: 'migpt',
  blurb: '小米小爱音箱语音对话。',
  aliases: ['xiaomi', 'mico'],
  order: 60,
};

export const miGPTPlugin: ChannelPlugin<ResolvedMiAccount> = {
  id: 'migpt',
  meta: {
    ...meta,
  },
  capabilities: {
    chatTypes: ['direct'],
    polls: false,
    threads: false,
    media: true,
    reactions: false,
    edit: false,
    reply: false,
    blockStreaming: false,
  },
  reload: { configPrefixes: ['channels.migpt'] },
  onboarding: miGPTOnboardingAdapter,

  // 新增：Agent Prompt 配置，用于定制 AI 在音箱场景下的行为规范
  agentPrompt: {
    description: '音箱播报规范',
    getConfig: (cfg: any) => {
      const migptCfg = cfg.channels?.migpt;
      return {
        enabled: true,
        systemPrompt: migptCfg?.systemPrompt,
      };
    },
    applyConfig: (cfg: any, updates: any) => {
      const nextCfg = { ...cfg } as ExtendedOpenClawConfig;
      const nextMigpt = { ...nextCfg.channels?.migpt };
      if (updates.systemPrompt !== undefined) {
        nextMigpt.systemPrompt = updates.systemPrompt;
      }
      nextCfg.channels = { ...nextCfg.channels, migpt: nextMigpt };
      return nextCfg;
    },
  },

  config: {
    listAccountIds: (cfg) => listMiAccountIds(cfg as unknown as ExtendedOpenClawConfig),
    resolveAccount: (cfg, accountId) =>
      resolveMiAccount(cfg as unknown as ExtendedOpenClawConfig, accountId),
    defaultAccountId: (cfg) => resolveDefaultMiAccountId(cfg as unknown as ExtendedOpenClawConfig),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setMiAccountEnabled(cfg as unknown as ExtendedOpenClawConfig, accountId, enabled),
    deleteAccount: ({ cfg, accountId }) =>
      deleteMiAccount(cfg as unknown as ExtendedOpenClawConfig, accountId),
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      name: account.name,
      devices: account.devices,
    }),
    resolveAllowFrom: ({ cfg, accountId }: { cfg: any; accountId?: string }) =>
      resolveMiAllowFrom(cfg as unknown as ExtendedOpenClawConfig, accountId),
    formatAllowFrom: ({ allowFrom }: { allowFrom: Array<string | number> }) => formatMiAllowFrom(allowFrom),
  },

  setup: {
    resolveAccountId: ({ accountId }: { accountId?: string }) => accountId?.trim().toLowerCase() || DEFAULT_ACCOUNT_ID,
    applyAccountConfig: ({ cfg, accountId, input }: { cfg: any; accountId?: string; input: any }) => {
      const migptCfg = cfg.channels?.migpt ?? {};
      const accountConfig = {
        userId: input.userId,
        password: input.password,
        passToken: input.passToken,
        devices: input.devices,
        enabled: true,
      };

      const isDefault = !accountId || accountId === DEFAULT_ACCOUNT_ID;

      if (isDefault) {
        return {
          ...cfg,
          channels: {
            ...cfg.channels,
            migpt: {
              ...migptCfg,
              ...accountConfig,
            },
          },
        } as ExtendedOpenClawConfig;
      }

      return {
        ...cfg,
        channels: {
          ...cfg.channels,
          migpt: {
            ...migptCfg,
            accounts: {
              ...migptCfg.accounts,
              [accountId]: accountConfig,
            },
          },
        },
      } as ExtendedOpenClawConfig;
    },
    validateInput: ({ input }: { input: any }) => {
      if (!input.userId) {
        return '小米 ID (userId) 是必需的';
      }
      if (!input.passToken && !input.password) {
        return '需要提供 passToken 或 password';
      }
      return null;
    },
  },

  messaging: {
    normalizeTarget: (target: string) => {
      // 支持格式：migpt:客厅音箱 或 客厅音箱
      let id = target.replace(/^migpt:/i, '');
      if (id.trim()) {
        return { ok: true, to: id.trim() };
      }
      return { ok: false, error: 'Invalid target format' };
    },
    targetResolver: {
      looksLikeId: (id: string): boolean => {
        // 简单的启发式判断：非空字符串
        return id.length > 0 && id.length < 100;
      },
      hint: 'MiGPT 目标格式：设备名称（如：客厅音箱）',
    },
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

      // 获取设备列表
      const devices = account.devices;
      if (devices.length === 0) {
        log?.error(`[migpt:${account.accountId}] No devices configured`);
        return;
      }

      // ============ MiMo TTS 初始化（如果配置了） ============
      const mimoConfig = (cfg as any).channels?.migpt?.mimo;
      if (mimoConfig?.apiKey) {
        // 清理旧实例，防止端口泄漏
        await MiSpeaker.cleanupMiMoTTS();

        const mimoTTS = new MiMoTTS({
          apiKey: mimoConfig.apiKey,
          baseUrl: mimoConfig.baseUrl,
          model: mimoConfig.model,
          voice: mimoConfig.voice,
          style: mimoConfig.style,
          stream: mimoConfig.stream,
          port: mimoConfig.port,
          host: mimoConfig.host,
        });
        await mimoTTS.init();
        await MiSpeaker.setMiMoTTS(mimoTTS);
        log?.info(`[migpt:${account.accountId}] MiMo TTS 已启用 (server: ${mimoTTS.serverUrl})`);
      }

      // ============ 持续对话状态 ============
      const keepAliveTimeout = (cfg as any).channels?.migpt?.keepAliveTimeout ?? 30;
      let keepAlive = (cfg as any).channels?.migpt?.keepAlive ?? false;
      let keepAliveTimer: ReturnType<typeof setTimeout> | null = null;

      /**
       * 重置持续对话超时计时器
       * 超时后自动退出持续对话模式
       */
      const resetKeepAliveTimer = () => {
        if (keepAliveTimer) clearTimeout(keepAliveTimer);
        if (keepAlive) {
          keepAliveTimer = setTimeout(() => {
            keepAlive = false;
            log?.info(`[migpt:${account.accountId}] 持续对话超时 (${keepAliveTimeout}s)，退出`);
          }, keepAliveTimeout * 1000);
        }
      };

      /**
       * 进入持续对话模式
       */
      const enterKeepAlive = () => {
        keepAlive = true;
        resetKeepAliveTimer();
        log?.info(`[migpt:${account.accountId}] 进入持续对话模式`);
      };

      /**
       * 退出持续对话模式
       */
      const exitKeepAlive = () => {
        keepAlive = false;
        if (keepAliveTimer) {
          clearTimeout(keepAliveTimer);
          keepAliveTimer = null;
        }
        log?.info(`[migpt:${account.accountId}] 退出持续对话模式`);
      };

      // 为每个设备启动轮询
      const devicePromises = devices.map(async (deviceName: string) => {
        log?.info(`[migpt:${account.accountId}] Starting poller for device: ${deviceName}`);

        // 初始化服务（传递启动播报配置）
        const initSuccess = await MiService.init({
          ...account.config,
          announceOnStart: account.config.announceOnStart ?? cfg.channels?.migpt?.announceOnStart,
          startupMessage: account.config.startupMessage ?? cfg.channels?.migpt?.startupMessage,
        }, deviceName);
        if (!initSuccess) {
          log?.error(`[migpt:${account.accountId}] Failed to initialize device: ${deviceName}`);
          return;
        }

        // 设置调试模式和音箱控制方式
        Debugger.debug = account.config.debug ?? false;

        // 更新状态
        ctx.setStatus({
          ...ctx.getStatus(),
          running: true,
          connected: true,
          lastConnectedAt: Date.now(),
        });

        // 获取轮询间隔
        const heartbeat = cfg.channels?.migpt?.heartbeat ?? 1000;

        // 持续对话唤醒关键词
        const enterKeywords: string[] = (cfg as any).channels?.migpt?.keepAliveEnterKeywords ?? ['打开连续对话', '进入持续对话', '开启持续对话', '持续对话模式'];
        const exitKeywords: string[] = (cfg as any).channels?.migpt?.keepAliveExitKeywords ?? ['关闭连续对话', '退出持续对话', '退出持续对话模式', '再见'];

        // 轮询消息
        while (!abortSignal.aborted) {
          try {
            const msg = await MiMessage.fetchNextMessage(deviceName);
            if (msg) {
              log?.info(`[migpt:${account.accountId}] Received message from ${deviceName}: ${msg.text.slice(0, 50)}...`);

              // ============ 持续对话关键词检测 ============
              if (enterKeywords.some(kw => msg.text.includes(kw))) {
                enterKeepAlive();
                const enterResult = await MiSpeaker.play({ text: '已进入持续对话模式' });
                // 等音频播放完成后再唤醒，确保语音完整播放
                const waitMs = enterResult.duration ? Math.ceil(enterResult.duration * 1000) + 200 : 4000;
                log?.info(`[migpt:${account.accountId}] 等待音频播放完成: ${waitMs}ms`);
                await sleep(waitMs);
                await MiService.wakeUp();
                log?.info(`[migpt:${account.accountId}] 持续对话：已唤醒音箱等待下一句`);
                continue;
              }
              if (exitKeywords.some(kw => msg.text.includes(kw))) {
                exitKeepAlive();
                await MiSpeaker.play({ text: '已退出持续对话模式' });
                continue;
              }

              // ============ 硬件控制指令过滤 ============
              // 这些指令应该由小爱原生处理，不发送给 openclaw
              
              // 豁免：持续对话控制指令
              const keepAliveKeywords = [...enterKeywords, ...exitKeywords];
              if (keepAliveKeywords.some(kw => msg.text.includes(kw))) {
                log?.info(`[migpt:${account.accountId}] 豁免持续对话指令: ${msg.text.slice(0, 30)}...`);
                continue;
              }
              
              // 从配置读取硬件控制动词关键词，默认值包含常见动词
              const hardwareControlVerbs: string[] = (cfg as any).channels?.migpt?.hardwareControlVerbs ?? [
                '播放', '打开', '关闭', '暂停', '继续', '停止', '切换',
                '开启', '关掉', '开', '关', '启动', '调节',
                '调高', '调低', '调大', '调小', '调亮', '调暗', '增大', '减小', '设置', '调到',
                '导航', '拨打', '打电话', '呼叫', '发短信', '发消息',
                '重启', '关机', '升级', '更新', '恢复出厂',
                '查询', '查看', '告诉我', '说一下', '播报',
              ];
              
              // 构建正则表达式：支持两种模式
              // 模式1：动词关键词 + 内容（如"打开灯"、"播放音乐"）
              // 模式2：任意内容 + 动词关键词 + 内容（如"大白调小一些"、"吸顶灯调亮一些"）
              const hardwareControlPattern = new RegExp(
                `^((${hardwareControlVerbs.join('|')})|.+(${hardwareControlVerbs.join('|')})).+`
              );
              
              const isHardwareControl = hardwareControlPattern.test(msg.text.trim());
              if (isHardwareControl) {
                log?.info(`[migpt:${account.accountId}] 跳过硬件控制指令: ${msg.text.slice(0, 30)}...`);
                continue;
              }

              // ============ 抢答抑制：立即暂停小爱原生回复 ============
              try {
                await MiSpeaker.pause();
              } catch {
                // 忽略暂停失败
              }

              // 重置持续对话计时器
              if (keepAlive) {
                resetKeepAliveTimer();
              }

              // 记录活动
              const pluginRuntime = getMiGPTRuntime();
              pluginRuntime.channel.activity.record({
                channel: 'migpt',
                accountId: account.accountId,
                direction: 'inbound',
              });

              // 构建路由
              const fromAddress = `migpt:${deviceName}`;
              const toAddress = `migpt:${account.accountId}`;
              const sessionKey = `${account.accountId}:${deviceName}`;

              // ============ 系统提示词注入 ============
              // 收集系统提示词（账户级别 + 全局）
              const systemPrompts: string[] = [];
              
              // 账户级别的 systemPrompt
              if (account.config.systemPrompt) {
                systemPrompts.push(account.config.systemPrompt);
              }
              
              // 全局 systemPrompt
              const globalSystemPrompt = (cfg as any).channels?.migpt?.systemPrompt;
              if (globalSystemPrompt && globalSystemPrompt !== account.config.systemPrompt) {
                systemPrompts.push(globalSystemPrompt);
              }

              // 构建消息体
              const envelopeOptions = pluginRuntime.channel.reply.resolveEnvelopeFormatOptions(cfg);
              const body = pluginRuntime.channel.reply.formatInboundEnvelope({
                Body: msg.text,
                BodyForAgent: msg.text,
                From: fromAddress,
                To: toAddress,
                SessionKey: sessionKey,
                ChatType: 'direct',
                SenderId: deviceName,
                SenderName: deviceName,
                Provider: 'migpt',
                Surface: 'migpt',
                MessageSid: `${deviceName}-${msg.timestamp}`,
                Timestamp: msg.timestamp,
                OriginatingChannel: 'migpt',
                envelopeOptions,
              });

              // 默认的音箱场景提示词（如果没有配置 systemPrompt）
              const DEFAULT_SPEAKER_PROMPT = `你是小米智能音箱助手，用简短口语回复。规则：普通对话回复 50 字以内，讲故事或查资料可以适当放宽限制不超过 200 字；不用 URL/代码/emoji/markdown 格式。`;

              // 构建 AI 看到的完整上下文
              const contextInfo = `你正在通过小米音箱与用户对话。

【会话上下文】
- 设备：${deviceName}
- 用户：${deviceName}
- 消息 ID: ${deviceName}-${msg.timestamp}
- 当前时间：${new Date(msg.timestamp).toLocaleString('zh-CN')}`;

              // BodyForAgent: AI 实际看到的完整上下文（动态数据 + 系统提示 + 用户输入）
              const agentBody = systemPrompts.length > 0
                ? `${contextInfo}\n\n${systemPrompts.join("\n\n")}\n\n${msg.text}`
                : `${contextInfo}\n\n${DEFAULT_SPEAKER_PROMPT}\n\n${msg.text}`;

              // 构建上下文
              const ctxPayload = pluginRuntime.channel.reply.finalizeInboundContext({
                Body: body,
                BodyForAgent: agentBody,
                RawBody: msg.text,
                CommandBody: msg.text,
                From: fromAddress,
                To: toAddress,
                SessionKey: sessionKey,
                AccountId: account.accountId,
                ChatType: 'direct',
                SenderId: deviceName,
                SenderName: deviceName,
                Provider: 'migpt',
                Surface: 'migpt',
                MessageSid: `${deviceName}-${msg.timestamp}`,
                Timestamp: msg.timestamp,
                OriginatingChannel: 'migpt',
                OriginatingTo: toAddress,
                CommandAuthorized: true,
              });

              // 分派消息到 OpenClaw
              await pluginRuntime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
                ctx: ctxPayload,
                cfg,
                dispatcherOptions: {
                  responsePrefix: '',
                  deliver: async (payload: { text?: string; mediaUrls?: string[]; mediaUrl?: string }, info: { kind: string }) => {
                    log?.info(`[migpt:${account.accountId}] deliver called, kind: ${info.kind}`);
                    if (payload.text) {
                      const playResult = await MiSpeaker.play({ text: payload.text });

                      // ============ 检测 AI 回复是否包含退出关键词 ============
                      const exitKeywordsInReply = ['退出', '关闭', '再见', '已退出', '已关闭'];
                      if (exitKeywordsInReply.some(kw => payload.text!.includes(kw))) {
                        exitKeepAlive();
                        log?.info(`[migpt:${account.accountId}] AI 回复包含退出关键词，退出持续对话`);
                      }

                      // ============ 持续对话：AI 回复后重新唤醒音箱 ============
                      if (keepAlive) {
                        // 等音频播放完成后再唤醒，确保语音完整播放
                        const waitMs = playResult.duration ? Math.ceil(playResult.duration * 1000) + 200 : 2000;
                        log?.info(`[migpt:${account.accountId}] 等待音频播放完成: ${waitMs}ms`);
                        await sleep(waitMs);
                        await MiService.wakeUp();
                        log?.info(`[migpt:${account.accountId}] 持续对话：已唤醒音箱等待下一句`);
                      }
                    }
                  },
                },
              });
            }
          } catch (err: any) {
            log?.error(`[migpt:${account.accountId}] Error polling messages: ${err.message}`);
            ctx.setStatus({
              ...ctx.getStatus(),
              lastError: err.message,
            });
          }

          await sleep(heartbeat);
        }

        log?.info(`[migpt:${account.accountId}] Stopping poller for device: ${deviceName}`);
      });

      await Promise.all(devicePromises);

      // 清理持续对话计时器
      if (keepAliveTimer) {
        clearTimeout(keepAliveTimer);
      }
    },
  },

  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      connected: false,
      lastConnectedAt: null,
      lastError: null,
      lastInboundAt: null,
      lastOutboundAt: null,
    },
    buildChannelSummary: ({ snapshot }: { snapshot: any }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      connected: snapshot.connected ?? false,
      lastConnectedAt: snapshot.lastConnectedAt ?? null,
      lastError: snapshot.lastError ?? null,
    }),
    buildAccountSnapshot: ({ account, runtime }: { account: any; runtime: any }) => ({
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
      lastOutboundAt: runtime?.lastOutboundAt ?? null,
    }),
  },
};
