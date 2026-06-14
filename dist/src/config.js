import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
function listMiAccountIds(cfg) {
  const migptCfg = cfg.channels?.migpt;
  if (!migptCfg?.accounts) {
    return [DEFAULT_ACCOUNT_ID];
  }
  return [DEFAULT_ACCOUNT_ID, ...Object.keys(migptCfg.accounts)];
}
function resolveMiAccount(cfg, accountId) {
  const id = accountId ?? DEFAULT_ACCOUNT_ID;
  const migptCfg = cfg.channels?.migpt;
  const isDefault = id === DEFAULT_ACCOUNT_ID;
  const accountConfig = isDefault ? { ...migptCfg } : migptCfg?.accounts?.[id] ?? {};
  const mergedConfig = {
    enabled: isDefault ? migptCfg?.enabled : accountConfig.enabled,
    userId: accountConfig.userId ?? migptCfg?.userId,
    password: accountConfig.password ?? migptCfg?.password,
    passToken: accountConfig.passToken ?? migptCfg?.passToken,
    debug: accountConfig.debug ?? migptCfg?.debug,
    timeout: accountConfig.timeout ?? migptCfg?.timeout,
    devices: accountConfig.devices ?? migptCfg?.devices ?? [],
    speakerControl: accountConfig.speakerControl ?? migptCfg?.speakerControl
  };
  const configured = !!(mergedConfig.userId && (mergedConfig.passToken || mergedConfig.password));
  return {
    accountId: id,
    enabled: mergedConfig.enabled ?? false,
    configured,
    name: accountConfig.name ?? (isDefault ? "Default" : id),
    devices: mergedConfig.devices ?? [],
    config: mergedConfig
  };
}
function resolveDefaultMiAccountId(cfg) {
  return cfg.channels?.migpt?.defaultAccount ?? DEFAULT_ACCOUNT_ID;
}
function applyMiAccountConfig(cfg, accountId, updates) {
  const isDefault = accountId === DEFAULT_ACCOUNT_ID;
  const migptCfg = cfg.channels?.migpt ?? {};
  if (isDefault) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        migpt: {
          ...migptCfg,
          ...updates
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
          [accountId]: {
            ...migptCfg.accounts?.[accountId],
            ...updates
          }
        }
      }
    }
  };
}
function setMiAccountEnabled(cfg, accountId, enabled) {
  const isDefault = accountId === DEFAULT_ACCOUNT_ID;
  const migptCfg = cfg.channels?.migpt ?? {};
  if (isDefault) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        migpt: {
          ...migptCfg,
          enabled
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
          [accountId]: {
            ...migptCfg.accounts?.[accountId],
            enabled
          }
        }
      }
    }
  };
}
function deleteMiAccount(cfg, accountId) {
  const isDefault = accountId === DEFAULT_ACCOUNT_ID;
  const migptCfg = cfg.channels?.migpt;
  if (isDefault) {
    const next = { ...cfg };
    const nextChannels = { ...cfg.channels };
    delete nextChannels.migpt;
    if (Object.keys(nextChannels).length > 0) {
      next.channels = nextChannels;
    } else {
      delete next.channels;
    }
    return next;
  }
  const accounts = { ...migptCfg?.accounts };
  delete accounts[accountId];
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      migpt: {
        ...migptCfg,
        accounts: Object.keys(accounts).length > 0 ? accounts : void 0
      }
    }
  };
}
function resolveMiAllowFrom(cfg, _accountId) {
  const migptCfg = cfg.channels?.migpt;
  const allowFrom = migptCfg?.allowFrom ?? [];
  return allowFrom.map((entry) => String(entry).trim()).filter(Boolean);
}
function formatMiAllowFrom(allowFrom) {
  return allowFrom.map((entry) => String(entry).trim()).filter(Boolean).map((entry) => entry.toLowerCase());
}
export {
  applyMiAccountConfig,
  deleteMiAccount,
  formatMiAllowFrom,
  listMiAccountIds,
  resolveDefaultMiAccountId,
  resolveMiAccount,
  resolveMiAllowFrom,
  setMiAccountEnabled
};
//# sourceMappingURL=config.js.map