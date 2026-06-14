import { DEFAULT_ACCOUNT_ID } from 'openclaw/plugin-sdk';
/**
 * 列出所有账户 ID
 */
export function listMiAccountIds(cfg) {
    const migptCfg = cfg.channels?.migpt;
    if (!migptCfg?.accounts) {
        return [DEFAULT_ACCOUNT_ID];
    }
    return [DEFAULT_ACCOUNT_ID, ...Object.keys(migptCfg.accounts)];
}
/**
 * 解析账户配置
 */
export function resolveMiAccount(cfg, accountId) {
    const id = accountId ?? DEFAULT_ACCOUNT_ID;
    const migptCfg = cfg.channels?.migpt;
    const isDefault = id === DEFAULT_ACCOUNT_ID;
    // 获取账户特定配置
    const accountConfig = isDefault
        ? { ...migptCfg }
        : migptCfg?.accounts?.[id] ?? {};
    // 合并全局和账户特定配置
    const mergedConfig = {
        enabled: isDefault ? migptCfg?.enabled : accountConfig.enabled,
        userId: accountConfig.userId ?? migptCfg?.userId,
        password: accountConfig.password ?? migptCfg?.password,
        passToken: accountConfig.passToken ?? migptCfg?.passToken,
        debug: accountConfig.debug ?? migptCfg?.debug,
        timeout: accountConfig.timeout ?? migptCfg?.timeout,
        devices: accountConfig.devices ?? migptCfg?.devices ?? [],
        speakerControl: accountConfig.speakerControl ?? migptCfg?.speakerControl,
    };
    // 检查是否已配置
    const configured = !!(mergedConfig.userId &&
        (mergedConfig.passToken || mergedConfig.password));
    return {
        accountId: id,
        enabled: mergedConfig.enabled ?? false,
        configured,
        name: accountConfig.name ?? (isDefault ? 'Default' : id),
        devices: mergedConfig.devices ?? [],
        config: mergedConfig,
    };
}
/**
 * 获取默认账户 ID
 */
export function resolveDefaultMiAccountId(cfg) {
    return cfg.channels?.migpt?.defaultAccount ?? DEFAULT_ACCOUNT_ID;
}
/**
 * 应用账户配置
 */
export function applyMiAccountConfig(cfg, accountId, updates) {
    const isDefault = accountId === DEFAULT_ACCOUNT_ID;
    const migptCfg = cfg.channels?.migpt ?? {};
    if (isDefault) {
        return {
            ...cfg,
            channels: {
                ...cfg.channels,
                migpt: {
                    ...migptCfg,
                    ...updates,
                },
            },
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
                    [accountId]: {
                        ...migptCfg.accounts?.[accountId],
                        ...updates,
                    },
                },
            },
        },
    };
}
/**
 * 设置账户启用状态
 */
export function setMiAccountEnabled(cfg, accountId, enabled) {
    const isDefault = accountId === DEFAULT_ACCOUNT_ID;
    const migptCfg = cfg.channels?.migpt ?? {};
    if (isDefault) {
        return {
            ...cfg,
            channels: {
                ...cfg.channels,
                migpt: {
                    ...migptCfg,
                    enabled,
                },
            },
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
                    [accountId]: {
                        ...migptCfg.accounts?.[accountId],
                        enabled,
                    },
                },
            },
        },
    };
}
/**
 * 删除账户
 */
export function deleteMiAccount(cfg, accountId) {
    const isDefault = accountId === DEFAULT_ACCOUNT_ID;
    const migptCfg = cfg.channels?.migpt;
    if (isDefault) {
        // 删除整个 migpt 配置
        const next = { ...cfg };
        const nextChannels = { ...cfg.channels };
        delete nextChannels.migpt;
        if (Object.keys(nextChannels).length > 0) {
            next.channels = nextChannels;
        }
        else {
            delete next.channels;
        }
        return next;
    }
    // 删除特定账户
    const accounts = { ...migptCfg?.accounts };
    delete accounts[accountId];
    return {
        ...cfg,
        channels: {
            ...cfg.channels,
            migpt: {
                ...migptCfg,
                accounts: Object.keys(accounts).length > 0 ? accounts : undefined,
            },
        },
    };
}
/**
 * 解析允许的设备列表
 */
export function resolveMiAllowFrom(cfg, _accountId) {
    const migptCfg = cfg.channels?.migpt;
    const allowFrom = migptCfg?.allowFrom ?? [];
    return allowFrom.map((entry) => String(entry).trim()).filter(Boolean);
}
/**
 * 格式化允许的设备列表
 */
export function formatMiAllowFrom(allowFrom) {
    return allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase());
}
//# sourceMappingURL=config.js.map