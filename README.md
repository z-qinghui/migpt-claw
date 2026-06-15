# migpt-claw

小米小爱音箱 OpenClaw Channel 插件，让小爱音箱成为你的 🦞龙虾 语音助手。

## 功能特性

- 🎤 **语音对话** - 对小爱音箱说话，🦞 语音回复
- 🔇 **抢答抑制** - 自动暂停小爱原生回复，避免与 AI 回复冲突
- 🔁 **持续对话** - 一次唤醒连续对话，无需重复说"小爱同学"
- 🎯 **智能分流** - 纯对话走 OpenClaw，音乐/硬件控制走小爱原生
- 🗣️ **MiMo TTS** - 支持小米 MiMo-V2.5-TT 自定义语音合成（流式）
- 📦 **流式输出** - 长文本分块播放，降低延迟
- 🔔 **状态提示** - 支持启动播报和收到消息提示音

## 快速开始

### 第一步：安装插件

#### 方式一：Git 克隆 + 本地安装（推荐）

适用于远程服务器或网络受限环境：

```bash
# 1. 克隆仓库到 OpenClaw 插件目录
git clone https://github.com/z-qinghui/migpt-claw.git ~/.openclaw/plugins/migpt-claw

# 2. 从本地路径安装（--link 模式，后续更新只需 git pull）
openclaw plugins install ~/.openclaw/plugins/migpt-claw --link
```

#### 方式二：通过 Git 直接安装

适用于本地机器且网络畅通：

```bash
openclaw plugins install "git:github.com/z-qinghui/migpt-claw@main"
```

#### 方式三：通过 npm 安装（暂不支持）

```bash
openclaw plugins install npm:@z-qinghui/migpt-claw
```

#### 方式四：通过 ClawHub 插件市场安装（暂不支持）

```bash
openclaw plugins install clawhub:@z-qinghui/migpt-claw
```

### 第二步：配置账号

编辑 `~/.openclaw/openclaw.json`，在 `channels` 中添加 migpt 配置：

```json
{
  "channels": {
    "migpt": {
      "enabled": true,
      "userId": "你的小米ID",
      "password": "你的密码",
      "passToken": "你的passToken",
      "devices": ["客厅音箱"],
      "announceOnStart": true,
      "startupMessage": "您的小龙虾已上线，随时为您服务",
      "acknowledgeOnReceive": true,
      "receiveMessage": "收到，处理中",
      "speakerControl": "mina",
      "keepAlive": true,
      "keepAliveTimeout": 30,
      "keepAliveEnterKeywords": ["打开连续对话", "进入持续对话"],
      "keepAliveExitKeywords": ["关闭连续对话", "退出持续对话", "再见"],
      "mimo": {
        "apiKey": "你的MiMo API Key",
        "baseUrl": "https://api.xiaomimimo.com/v1",
        "model": "mimo-v2.5-tts",
        "voice": "冰糖",
        "style": "温柔活泼"
      }
    }
  }
}
```

**必填字段**：

| 字段 | 说明 | 获取方式 |
| --- | --- | --- |
| `userId` | 小米 ID（数字） | 小米账号「个人信息」-「小米 ID」 |
| `password` | 小米账号密码 | - |
| `passToken` | 登录辅助凭证（推荐） | 浏览器抓取小米登录 Cookie |
| `devices` | 音箱设备名称列表 | 米家 App 中的设备名称，**必须完全一致** |

**可选字段**：

| 字段 | 说明 | 默认值 |
| --- | --- | --- |
| `speakerControl` | 音箱控制方式 | `mina` |
| `announceOnStart` | 启动时播报上线文案 | `false` |
| `startupMessage` | 上线播报文案 | `您的小龙虾已上线，随时为您服务` |
| `acknowledgeOnReceive` | 收到消息时回复提示 | `false` |
| `receiveMessage` | 收到消息回复文案 | `收到，处理中` |
| `keepAlive` | 默认开启持续对话 | `false` |
| `keepAliveTimeout` | 持续对话超时秒数 | `30` |
| `keepAliveEnterKeywords` | 进入持续对话关键词 | `["打开连续对话", "进入持续对话"]` |
| `keepAliveExitKeywords` | 退出持续对话关键词 | `["关闭连续对话", "退出持续对话", "再见"]` |
| `mimo` | MiMo TTS 配置 | 不配置则使用小米原生 TTS |

### 第三步：启动服务

```bash
openclaw gateway restart
```

### 第四步：验证

```bash
# 查看插件状态
openclaw plugins list --enabled --verbose

# 查看网关运行状态
openclaw gateway status --deep

# 如有问题，运行诊断
openclaw doctor
```

### 更新插件

```bash
# 方式一：Git 安装的插件（--link 模式）
cd ~/.openclaw/plugins/migpt-claw && git pull
openclaw gateway restart

# 方式二：npm/ClawHub 安装的插件
openclaw plugins update migpt-claw
openclaw gateway restart
```

### 音箱控制方式

`speakerControl` 指定与小爱音箱通信的控制方式：

- **`mina`**（默认）：使用 MiNA API，适用于大多数型号
- **`miot`**：使用 MIoT API，适用于部分特殊型号

**已知需要 `miot` 的型号**：LX04（小爱音箱 Pro）、X10A（小爱音箱 X10）、L05B/L05C（小爱音箱 Play 增强版）

如果默认 `mina` 无法正常工作，请尝试切换为 `miot`。完整兼容性参考 [MiGPT 兼容性文档](https://github.com/idootop/mi-gpt/blob/main/docs/compatibility.md)。

### 持续对话

启用 `keepAlive` 后，一次唤醒可连续对话，无需重复说"小爱同学"：

```json
{
  "channels": {
    "migpt": {
      "keepAlive": true,
      "keepAliveTimeout": 30,
      "keepAliveEnterKeywords": ["打开连续对话", "进入持续对话", "开启持续对话", "持续对话模式"],
      "keepAliveExitKeywords": ["关闭连续对话", "退出持续对话", "退出持续对话模式", "再见"]
    }
  }
}
```

**使用方法**：

1. 先正常唤醒小爱："小爱同学"
2. 说进入关键词："打开连续对话" 或 "开启持续对话"
3. 听到"已进入持续对话模式"提示后，即可连续对话
4. 说退出关键词或等待超时自动退出

**默认关键词**：

| 功能 | 默认关键词 |
| --- | --- |
| 进入持续对话 | "打开连续对话"、"进入持续对话"、"开启持续对话"、"持续对话模式" |
| 退出持续对话 | "关闭连续对话"、"退出持续对话"、"退出持续对话模式"、"再见" |

**工作原理**：

- AI 回复后自动调用 MIoT 唤醒命令（`siid=5, aiid=3`）重新激活音箱麦克风
- 超时无新消息自动退出持续对话模式
- 支持语音关键词动态切换

**⚠️ 已知问题：小爱原生抢答**

在持续对话模式下，小爱音箱听到你说话后会**先用原生 AI 回复**，然后 migpt-claw 才收到消息并用 OpenClaw 回复。这是 MiGPT 项目的已知限制（[相关 issue](https://github.com/idootop/mi-gpt/issues/14)），目前没有完美解决方案。

**应对方法**：
- 等小爱原生回复说完后，OpenClaw 的回复会接着播放
- 或者说"小爱同学，闭嘴"打断原生回复

**抢答抑制**：收到新消息时立即暂停小爱原生回复，避免与 AI 回复冲突（借鉴 [MiGPT](https://github.com/idootop/mi-gpt) 的 `pause()` 机制）。

### MiMo 自定义 TTS

支持小米 [MiMo-V2.5-TT](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/speech-synthesis-v2.5) 语音合成，提供更自然的语音播报。

#### 基础配置

```json
{
  "channels": {
    "migpt": {
      "mimo": {
        "apiKey": "your-mimo-api-key",
        "baseUrl": "https://api.xiaomimimo.com/v1",
        "model": "mimo-v2.5-tts",
        "voice": "冰糖",
        "style": "温柔活泼"
      }
    }
  }
}
```

#### 配置说明

| 字段 | 说明 | 默认值 |
| --- | --- | --- |
| `apiKey` | MiMo API Key（必填） | - |
| `baseUrl` | MiMo API 地址 | `https://api.xiaomimimo.com/v1` |
| `model` | TTS 模型 | `mimo-v2.5-tts` |
| `voice` | 预设音色 ID | `mimo_default` |
| `style` | 风格指令 | - |
| `stream` | 启用流式传输（降低首字延迟） | `true` |
| `port` | TTS 服务器固定端口（0 = 随机） | `0` |
| `host` | TTS 服务器监听地址 | `0.0.0.0` |

#### 可用音色

| 音色 | ID | 语言 | 性别 |
| --- | --- | --- | --- |
| 冰糖 | `冰糖` | 中文 | 女 |
| 茉莉 | `茉莉` | 中文 | 女 |
| 苏打 | `苏打` | 中文 | 男 |
| 白桦 | `白桦` | 中文 | 男 |
| Mia | `Mia` | 英文 | 女 |
| Chloe | `Chloe` | 英文 | 女 |

**风格示例**：`温柔`、`活泼`、`磁性`、`甜美`、`深沉`、`俏皮`、`东北话`、`四川话`

#### 工作原理

```
用户说话 → 小爱音箱 → MiMo TTS API（生成音频）→ 本地 HTTP 服务器托管 → 音箱播放
```

流式模式下，MiMo API 返回 PCM16 音频流，本地实时拼接为 WAV，边生成边播放，首字延迟更低。

#### ⚠️ 云服务器部署注意事项

**核心问题**：小爱音箱在你的**本地网络**，OpenClaw 在**云服务器**。音箱必须能访问 TTS 音频 URL。

**解决方案**：设置环境变量 `MIMO_TTS_HOST_IP` 为云服务器的**公网 IP**，并开放 TTS 端口。

**步骤**：

1. **设置公网 IP 环境变量**

   在 `docker-compose.yml` 中添加：
   ```yaml
   environment:
     - MIMO_TTS_HOST_IP=你的公网IP
   ```

2. **配置固定端口**

   在 `openclaw.json` 的 mimo 配置中添加固定端口（避免每次重启端口变化）：
   ```json
   "mimo": {
     "apiKey": "...",
     "port": 18790
   }
   ```

3. **开放防火墙和安全组**

   - 服务器防火墙：`iptables -A INPUT -p tcp --dport 18790 -j ACCEPT`
   - 云服务商安全组：在控制台添加入方向规则，放行 TCP 端口 18790

4. **重启服务**

   ```bash
   docker compose up -d
   ```

#### 本地网络部署

如果 OpenClaw 和小爱音箱在**同一局域网**，无需设置 `MIMO_TTS_HOST_IP`，插件会自动检测局域网 IP。

#### 故障排查

**问题 1：音箱亮灯但没声音**

原因：音箱无法访问 TTS 音频 URL。

排查步骤：
```bash
# 1. 查看 TTS 服务器日志，确认 URL
docker logs openclaw 2>&1 | grep "MiMo TTS 播放"
# 输出示例: 🔊 MiMo TTS 播放: http://47.103.150.141:18790/audio/xxx.wav

# 2. 测试 URL 是否可访问
curl -I http://47.103.150.141:18790/audio/xxx.wav
# 应返回 HTTP 200

# 3. 如果返回超时/拒绝连接，检查：
#    - 防火墙是否放行端口
#    - 云服务商安全组是否放行
#    - MIMO_TTS_HOST_IP 是否正确
```

**问题 2：TTS 端口与 OpenClaw 冲突**

错误日志：`EADDRINUSE: address already in use`

原因：mimo.port 设置的端口被其他服务占用。

解决：更换端口，确保不与 OpenClaw（默认 37105）冲突。

**问题 3：MiMo API 调用失败**

错误日志：`⚠️ MiMo TTS 失败，回退到原生 TTS`

排查步骤：
```bash
# 1. 检查 API Key 是否正确
docker logs openclaw 2>&1 | grep "MiMo API error"

# 2. 测试 API 连通性
curl -X POST https://api.xiaomimimo.com/v1/chat/completions \
  -H "api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5-tts","messages":[{"role":"assistant","content":"测试"}],"audio":{"format":"wav","voice":"冰糖"}}'

# 3. 检查 baseUrl 是否正确（有些 API 代理地址不同）
```

**问题 4：查看详细日志**

```bash
# 查看 MiMo TTS 相关日志
docker logs openclaw 2>&1 | grep -i "mimo\|tts"

# 查看完整启动日志
docker logs openclaw --tail 200
```

### 智能分流

插件自动区分对话和硬件控制命令：

- **纯对话**（小爱回复类型为 TTS/LLM 且仅有 1 条回答）→ 发送给 OpenClaw AI 处理
- **音乐播放**（小爱回复包含 TTS + Audio 多条回答）→ 由小爱原生处理
- **硬件控制**（开关灯、调节亮度、风扇/空调/加湿器等）→ 由小爱原生处理

无需额外配置，基于小米 API 返回的消息类型自动判断。

## 设备名称

设备名称必须与米家 App 中设置的名称**完全一致**（包括大小写和空格）。

如果不确定设备名称，可以：

1. 开启 `debug: true` 配置
2. 启动服务查看设备列表
3. 日志中会打印所有可用设备

## 使用技能

### 播报规范

插件内置智能播报规范，AI 会自动判断内容是否适合语音播报：

- ✅ **适合播报**：简短回复、确认信息、简单问答
- ❌ **不适合播报**：代码、长文、数据、多媒体内容

对于不适合播报的内容，AI 会告知用户已通过其他渠道（如微信、邮件等）发送。

### 音量控制

插件注册了 `set_volume` 和 `get_volume` 工具，AI 可通过 tool call 控制音箱音量：

- "把音量调到 50"
- "现在音量多大？"

## 故障排查

### 登录失败

**错误**: `❌ 本次登录需要验证码，请使用 passToken 重新登录`

**解决**: 使用 passToken 替代密码登录，或尝试多次登录直到不需要验证码

### 设备未找到

**错误**: `❌ 找不到设备：客厅音箱`

**解决**:

1. 检查设备名称是否与米家 App 中完全一致
2. 开启 `debug: true` 查看可用设备列表
3. 注意错别字，如「音响」vs「音箱」

### 消息轮询失败

**错误**: `❌ getConversations failed`

**解决**:

1. 检查网络连接
2. 检查 serviceToken 是否过期
3. 删除 `.mi.json` 缓存文件重新登录

## 项目结构

```text
migpt-claw/
├── index.ts                 # 插件完整入口
├── setup-entry.ts           # 轻量级 Setup 入口（onboarding/config repair）
├── openclaw.plugin.json     # 插件清单（marketplace 发现+配置 schema）
├── src/
│   ├── channel.ts          # Channel 核心
│   ├── service.ts          # 认证服务
│   ├── message.ts          # 消息轮询
│   ├── speaker.ts          # TTS 播放（支持 MiMo + 原生）
│   ├── config.ts           # 配置解析
│   ├── types.ts            # 类型定义
│   ├── outbound.ts         # 消息发送
│   ├── onboarding.ts       # 安装向导
│   ├── runtime.ts          # 运行时管理
│   ├── tts/                # 自定义 TTS
│   │   └── mimo.ts        # MiMo-V2.5-TT 语音合成
│   ├── mi/                 # 小米服务
│   │   ├── mina.ts        # MiNA API
│   │   ├── miot.ts        # MIoT API
│   │   ├── account.ts     # 账号认证
│   │   ├── common.ts      # 通用工具
│   │   └── typing.ts      # 类型定义
│   └── utils/              # 工具函数
│       ├── http.ts        # HTTP 请求
│       ├── codec.ts       # 编解码
│       ├── hash.ts        # 哈希工具
│       ├── io.ts          # 文件 IO
│       └── parse.ts       # 解析工具
└── skills/
    └── migpt-volume/       # 音量控制技能
        ├── index.ts
        └── SKILL.md
```

## 更新日志

### 2026-06-15

**修复**：
- 🐛 **持续对话音频播放完成问题**：之前唤醒音箱时会打断正在播放的回复，现在根据音频实际时长等待播放完成后再唤醒（额外加 0.5s 缓冲）
- 🐛 **channelConfigs 配置警告**：修复 `channel plugin manifest declares migpt without channelConfigs metadata` 警告，使用正确的 `schema` 包装格式
- 🐛 **新增 enabled/streaming 配置项**：在 channelConfigs schema 中添加 `enabled` 和 `streaming` 属性定义

**优化**：
- ✨ **音频时长返回**：MiMo TTS `synthesize()` 现在返回 `duration`（音频时长），用于精确控制唤醒时机
- ✨ **调试日志增强**：`Speaker.play()` 和 `MiNA.play()` 添加详细日志输出，便于问题排查

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化自动构建）
npm run dev

# 构建
npm run build

# 本地测试安装
openclaw plugins install . --link
openclaw gateway restart
```

## 相关项目

本项目受到以下优秀项目的启发和帮助：

- **[MiGPT](https://github.com/idootop/mi-gpt)** - 小爱音箱接入 ChatGPT/豆包的独立应用（已归档），支持长短期记忆、角色扮演、自定义 TTS、智能家居 Agent 等功能。本项目借鉴了其小米 API 对接方案
- **[MiGPT Next](https://github.com/idootop/migpt-next)** - MiGPT 的继任版本，让小爱音箱接入 AI 大模型
- **[MiService](https://github.com/yihong0618/MiService)** - 小米账号认证和米家设备控制基础库
- **[Open-XiaoAI](https://github.com/idootop/open-xiaoai)** - MiGPT 作者推荐的小爱音箱 Pro 继任项目，支持自定义唤醒词、连续对话

### MiGPT vs migpt-claw 对比

| 维度 | MiGPT | migpt-claw |
| --- | --- | --- |
| 架构 | 独立应用（Docker/Node.js） | OpenClaw Channel 插件 |
| AI 接入 | 直接调用 ChatGPT/豆包 API | 通过 OpenClaw 网关，支持任意模型 |
| 记忆系统 | 内置长短期记忆 | 依赖 OpenClaw 管理 |
| 部署方式 | Docker 容器 / npm 包 | 插件市场安装（ClawHub/npm/Git） |
| 扩展能力 | 自成体系 | Skills 系统 + 多渠道协作（如音箱+微信） |
| TTS 定制 | 支持豆包语音音色 | 支持 MiMo-V2.5-TT + 小米原生 TTS |
| 配置方式 | `.env` + `.migpt.js` | OpenClaw 统一配置 |
| 项目状态 | 已归档（2026.04） | 活跃维护 |

向以上项目的作者致敬！🙏

## 开源协议

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 免责声明

本项目仅供学习和研究使用，不得用于任何商业用途或非法目的。

- 使用本项目时，请遵守当地法律法规和小米公司的相关服务条款
- 本项目与小米公司无任何关联，不构成任何官方支持或背书
- 使用本项目可能导致小米账号异常，请谨慎使用并自行承担风险
- 建议仅使用测试账号或非主要账号进行体验
- 如因使用本项目造成的任何损失（包括但不限于账号封禁、数据丢失等），本项目作者不承担任何责任
- 本项目按「原样」提供，不提供任何明示或暗示的保证

如将本项目用于生产环境或其他重要场景，请务必：

1. 仔细阅读并遵守小米开放平台的相关规范
2. 通过官方渠道获取合法的 API 调用权限
3. 评估潜在的法律和技术风险
