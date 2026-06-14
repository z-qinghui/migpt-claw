/**
 * setup-entry.ts — 轻量级 Setup 入口
 *
 * OpenClaw 在以下场景仅加载此文件（不加载完整 index.ts）：
 * - 频道已禁用但需要 setup 界面（onboarding、config repair）
 * - 频道已启用但未配置
 * - 延迟加载模式下，gateway 启动前仅需 setup 表面
 */
import { defineSetupPluginEntry } from 'openclaw/plugin-sdk/channel-core';
import { miGPTPlugin } from './src/channel.js';

export default defineSetupPluginEntry(miGPTPlugin);
