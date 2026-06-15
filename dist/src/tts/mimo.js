import { createServer } from "node:http";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
class MiMoTTS {
  _server = null;
  _serverUrl = "";
  _audioDir = "";
  _config;
  _ready = false;
  constructor(config) {
    this._config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.xiaomimimo.com/v1",
      model: config.model ?? "mimo-v2.5-tts",
      voice: config.voice ?? "mimo_default",
      style: config.style ?? "",
      stream: config.stream ?? true,
      port: config.port ?? 0,
      host: config.host ?? "0.0.0.0"
    };
  }
  /**
   * 初始化：创建临时目录 + 启动 HTTP 服务器
   */
  async init() {
    if (this._ready) return true;
    try {
      this._audioDir = join(tmpdir(), "migpt-claw-tts", randomUUID());
      await mkdir(this._audioDir, { recursive: true });
      this._server = createServer((req, res) => {
        const url = decodeURIComponent(req.url ?? "");
        if (!url.startsWith("/audio/")) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        const filePath = join(this._audioDir, url.replace("/audio/", ""));
        serveWavFile(filePath, res).catch(() => {
          res.writeHead(404);
          res.end("Not Found");
        });
      });
      await new Promise((resolve, reject) => {
        this._server.listen(this._config.port, this._config.host, () => {
          const addr = this._server.address();
          if (addr && typeof addr === "object") {
            this._serverUrl = `http://${addr.address === "::" ? "localhost" : addr.address}:${addr.port}`;
            this._ready = true;
            resolve();
          } else {
            reject(new Error("Failed to get server address"));
          }
        });
        this._server.on("error", reject);
      });
      console.log(`\u2705 MiMo TTS \u670D\u52A1\u5668\u5DF2\u542F\u52A8: ${this._serverUrl}`);
      return true;
    } catch (err) {
      console.error("\u274C MiMo TTS \u521D\u59CB\u5316\u5931\u8D25:", err.message);
      return false;
    }
  }
  /**
   * 生成语音并返回可播放的 URL
   */
  async synthesize(text, options) {
    if (!this._ready) {
      const ok = await this.init();
      if (!ok) return { url: "", success: false, error: "TTS server not initialized" };
    }
    try {
      const messages = [];
      const style = options?.style ?? this._config.style;
      if (style) {
        messages.push({ role: "user", content: style });
      }
      messages.push({ role: "assistant", content: text });
      const voice = options?.voice ?? this._config.voice;
      const useStream = this._config.stream;
      const body = {
        model: this._config.model,
        messages,
        audio: { format: useStream ? "pcm16" : "wav", voice },
        stream: useStream
      };
      const response = await fetch(`${this._config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "api-key": this._config.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown");
        return { url: "", success: false, error: `MiMo API error ${response.status}: ${errText}` };
      }
      let audioBuffer;
      if (useStream) {
        const pcmChunks = [];
        const reader = response.body?.getReader();
        if (!reader) {
          return { url: "", success: false, error: "Failed to read streaming response" };
        }
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;
            try {
              const chunk = JSON.parse(jsonStr);
              const audioData = chunk?.choices?.[0]?.delta?.audio?.data;
              if (audioData) {
                pcmChunks.push(Buffer.from(audioData, "base64"));
              }
            } catch {
            }
          }
        }
        if (pcmChunks.length === 0) {
          return { url: "", success: false, error: "No audio data in streaming response" };
        }
        const pcmData = Buffer.concat(pcmChunks);
        audioBuffer = pcmToWav(pcmData, 24e3, 1, 16);
      } else {
        const data = await response.json();
        const audioBase64 = data?.choices?.[0]?.message?.audio?.data;
        if (!audioBase64) {
          return { url: "", success: false, error: "No audio data in MiMo response" };
        }
        audioBuffer = Buffer.from(audioBase64, "base64");
      }
      const fileName = `${randomUUID()}.wav`;
      const filePath = join(this._audioDir, fileName);
      await writeFile(filePath, audioBuffer);
      const url = `${this._serverUrl}/audio/${fileName}`;
      const headerSize = 44;
      const sampleRate = 24e3;
      const bytesPerSample = 2;
      const duration = (audioBuffer.length - headerSize) / (sampleRate * bytesPerSample);
      return { url, success: true, duration };
    } catch (err) {
      return { url: "", success: false, error: err.message };
    }
  }
  /**
   * 清理临时文件和关闭服务器
   */
  async destroy() {
    if (this._server) {
      await new Promise((resolve) => {
        this._server.close(() => resolve());
      });
      this._server = null;
    }
    if (this._audioDir) {
      await rm(this._audioDir, { recursive: true, force: true }).catch(() => {
      });
    }
    this._ready = false;
  }
  get ready() {
    return this._ready;
  }
  get serverUrl() {
    return this._serverUrl;
  }
}
async function serveWavFile(filePath, res) {
  const { readFile } = await import("node:fs/promises");
  const data = await readFile(filePath);
  res.writeHead(200, {
    "Content-Type": "audio/wav",
    "Content-Length": data.length,
    "Cache-Control": "no-cache"
  });
  res.end(data);
}
function pcmToWav(pcmData, sampleRate, channels, bitsPerSample) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);
  return buffer;
}
export {
  MiMoTTS
};
//# sourceMappingURL=mimo.js.map