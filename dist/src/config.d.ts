import { OpenClawConfig } from 'openclaw/plugin-sdk';
import { MiServiceConfig } from './service.js';
import './mi/mina.js';
import './mi/typing.js';
import './mi/miot.js';

/**
 * 小米音箱 Channel 配置
 */
interface MiGPTConfig extends MiServiceConfig {
    /** 启用频道 */
    enabled?: boolean;
    /** 默认账户 ID */
    defaultAccount?: string;
    /** 设备访问策略：pairing/allowlist/open */
    devicePolicy?: 'pairing' | 'allowlist' | 'open';
    /** 允许的设备名称白名单 */
    allowFrom?: Array<string | number>;
    /** 启用流式 TTS */
    streaming?: boolean;
    /** TTS 文本分块长度（汉字） */
    textChunkLimit?: number;
    /** TTS 语速（0.5-2.0） */
    ttsSpeed?: number;
    /** 默认音量（6-100） */
    volume?: number;
    /** 消息轮询间隔（毫秒） */
    heartbeat?: number;
    /** 设备名称列表 */
    devices?: string[];
    /** 账户配置 */
    accounts?: Record<string, MiGPTAccountConfig>;
    /** 音箱控制方式：mina/miot */
    speakerControl?: 'mina' | 'miot';
    /** 系统提示词：用于定制 AI 在音箱场景下的行为规范 */
    systemPrompt?: string;
    /** 启动时是否播报上线文案 */
    announceOnStart?: boolean;
    /** 上线播报文案 */
    startupMessage?: string;
    /** 收到消息时是否回复收到 */
    acknowledgeOnReceive?: boolean;
    /** 收到消息回复文案 */
    receiveMessage?: string;
}
/**
 * 账户配置
 */
interface MiGPTAccountConfig extends MiServiceConfig {
    /** 启用账户 */
    enabled?: boolean;
    /** 账户名称 */
    name?: string;
    /** 设备名称列表 */
    devices?: string[];
    /** 系统提示词：用于定制 AI 在音箱场景下的行为规范 */
    systemPrompt?: string;
    /** 启动时是否播报上线文案 */
    announceOnStart?: boolean;
    /** 上线播报文案 */
    startupMessage?: string;
    /** 收到消息时是否回复收到 */
    acknowledgeOnReceive?: boolean;
    /** 收到消息回复文案 */
    receiveMessage?: string;
}
/**
 * 解析后的账户信息
 */
interface ResolvedMiAccount {
    /** 账户 ID */
    accountId: string;
    /** 启用状态 */
    enabled: boolean;
    /** 是否已配置 */
    configured: boolean;
    /** 账户名称 */
    name?: string;
    /** 设备列表 */
    devices: string[];
    /** 配置详情 */
    config: MiGPTAccountConfig;
}
/**
 * OpenClaw 配置类型扩展
 */
interface ExtendedOpenClawConfig extends OpenClawConfig {
    channels?: {
        migpt?: MiGPTConfig;
    };
}
/**
 * 列出所有账户 ID
 */
declare function listMiAccountIds(cfg: ExtendedOpenClawConfig): string[];
/**
 * 解析账户配置
 */
declare function resolveMiAccount(cfg: ExtendedOpenClawConfig, accountId?: string): ResolvedMiAccount;
/**
 * 获取默认账户 ID
 */
declare function resolveDefaultMiAccountId(cfg: ExtendedOpenClawConfig): string;
/**
 * 应用账户配置
 */
declare function applyMiAccountConfig(cfg: ExtendedOpenClawConfig, accountId: string, updates: Partial<MiGPTAccountConfig>): ExtendedOpenClawConfig;
/**
 * 设置账户启用状态
 */
declare function setMiAccountEnabled(cfg: ExtendedOpenClawConfig, accountId: string, enabled: boolean): ExtendedOpenClawConfig;
/**
 * 删除账户
 */
declare function deleteMiAccount(cfg: ExtendedOpenClawConfig, accountId: string): ExtendedOpenClawConfig;
/**
 * 解析允许的设备列表
 */
declare function resolveMiAllowFrom(cfg: ExtendedOpenClawConfig, _accountId?: string): string[];
/**
 * 格式化允许的设备列表
 */
declare function formatMiAllowFrom(allowFrom: Array<string | number>): string[];

export { type ExtendedOpenClawConfig, type MiGPTAccountConfig, type MiGPTConfig, type ResolvedMiAccount, applyMiAccountConfig, deleteMiAccount, formatMiAllowFrom, listMiAccountIds, resolveDefaultMiAccountId, resolveMiAccount, resolveMiAllowFrom, setMiAccountEnabled };
