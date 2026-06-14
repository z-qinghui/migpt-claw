import { MiService } from "./service.js";
import { MiSpeaker } from "./speaker.js";
import { resolveMiAccount } from "./config.js";
function chunkText(text, limit) {
  if (text.length <= limit) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt <= 0 || splitAt < limit * 0.5) {
      splitAt = remaining.lastIndexOf(" ", limit);
    }
    if (splitAt <= 0 || splitAt < limit * 0.5) {
      splitAt = limit;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}
const miOutbound = {
  deliveryMode: "direct",
  chunker: chunkText,
  chunkerMode: "plain",
  textChunkLimit: 200,
  sendText: async ({ to, text, accountId, cfg }) => {
    const account = resolveMiAccount(cfg, accountId);
    if (!account.configured) {
      return {
        channel: "migpt",
        error: new Error("Account not configured")
      };
    }
    const initSuccess = await MiService.init(account.config, to);
    if (!initSuccess) {
      return {
        channel: "migpt",
        error: new Error("Failed to initialize MiService")
      };
    }
    const volume = cfg.channels?.migpt?.volume;
    if (volume && volume >= 6 && volume <= 100) {
      await MiSpeaker.setVolume(volume);
    }
    const streaming = cfg.channels?.migpt?.streaming ?? true;
    const chunkLimit = cfg.channels?.migpt?.textChunkLimit ?? 200;
    if (streaming && text.length > chunkLimit) {
      const chunks = chunkText(text, chunkLimit);
      for (const chunk of chunks) {
        const result = await MiSpeaker.play({ text: chunk });
        if (!result.success) {
          return {
            channel: "migpt",
            error: new Error(result.error)
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      return { channel: "migpt", messageId: Date.now().toString() };
    } else {
      const result = await MiSpeaker.play({ text });
      if (!result.success) {
        return {
          channel: "migpt",
          error: new Error(result.error)
        };
      }
      return { channel: "migpt", messageId: Date.now().toString() };
    }
  },
  sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => {
    const account = resolveMiAccount(cfg, accountId);
    if (!account.configured) {
      return {
        channel: "migpt",
        error: new Error("Account not configured")
      };
    }
    const initSuccess = await MiService.init(account.config, to);
    if (!initSuccess) {
      return {
        channel: "migpt",
        error: new Error("Failed to initialize MiService")
      };
    }
    if (text?.trim()) {
      await MiSpeaker.play({ text });
    }
    if (mediaUrl) {
      const result = await MiSpeaker.play({ url: mediaUrl });
      if (!result.success) {
        return {
          channel: "migpt",
          error: new Error(result.error)
        };
      }
    }
    return { channel: "migpt", messageId: Date.now().toString() };
  }
};
export {
  miOutbound
};
//# sourceMappingURL=outbound.js.map