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

### 1. 安装插件

#### 方式一：通过 ClawHub 插件市场安装（推荐）

```bash
# 从 ClawHub 市场安装（支持远程同步更新）
openclaw plugins install clawhub:@z-qinghui/migpt-claw
```

#### 方式二：通过 npm 安装

```bash
# 从 npm 注册表安装
openclaw plugins install npm:@z-qinghui/migpt-claw
```

#### 方式三：通过 Git 安装

```bash
# 从 Git 仓库安装（指定分支或标签）
openclaw plugins install git:github.com/z-qinghui/migpt-claw@main
```

#### 方式四：本地安装（开发模式）

```bash
# 从本地目录安装（支持热更新，适合开发调试）
openclaw plugins install ./migpt-claw --link
```

### 更新插件

```bash
# 更新到最新版本
openclaw plugins update migpt-claw

# 查看已安装插件列表
openclaw plugins list --enabled --verbose
```

### 2. 配置账号

编辑 `~/.openclaw/openclaw.json` 配置文件：

**推荐配置（密码 + passToken）**：

```json
{
  "channels": {
    "migpt": {
      "enabled": true,
      "userId": "123456789",
      "password": "your_password",
      "passToken": "your_pass_token",
      "devices": ["客厅音箱"],
      "announceOnStart": true,
      "startupMessage": "您的小龙虾已上线，随时为您服务",
      "acknowledgeOnReceive": true,
      "receiveMessage": "收到，处理中",
      "keepAlive": true,
      "keepAliveTimeout": 30,
      "mimo": {
        "apiKey": "your-mimo-api-key",
        "voice": "冰糖",
        "style": "温柔活泼"
      }
    }
  }
}
```

**配置说明**：

- `userId`：小米 ID（数字，在小米账号「个人信息」-「小米 ID」查看）
- `password`：小米账号密码
- `passToken`：登录辅助凭证，避免验证码（推荐配置）
- `devices`：小爱音箱设备名称列表
- `announceOnStart`：启动时是否播报上线文案
- `startupMessage`：上线播报文案
- `acknowledgeOnReceive`：收到消息时是否回复提示
- `receiveMessage`：收到消息回复文案
- `speakerControl`：音箱控制方式（`mina` 或 `miot`，默认 `mina`）
- `keepAlive`：是否默认开启持续对话模式（默认 `false`）
- `keepAliveTimeout`：持续对话超时秒数，超时自动退出（默认 `30`）
- `keepAliveEnterKeywords`：进入持续对话的语音关键词
- `keepAliveExitKeywords`：退出持续对话的语音关键词
- `mimo`：MiMo-V2.5-TT 自定义 TTS 配置（见下方）

### 音箱控制方式说明

**`speakerControl`**：指定与小爱音箱通信的控制方式

- **`mina`**（默认）：使用 MiNA API，适用于大多数小爱音箱型号
- **`miot`**：使用 MIoT API，适用于部分需要特殊控制的型号

**已知需要 `miot` 的型号**：

- LX04（小爱音箱 Pro）
- X10A（小爱音箱 X10）
- L05B / L05C（小爱音箱 Play 增强版）

**注意**：

- 不同型号的小爱音箱对 `mina` 和 `miot` 的支持情况可能不同
- 如果默认 `mina` 方式无法正常工作，请尝试切换为 `miot`
- 完整兼容性列表参考：[MiGPT 兼容性文档](https://github.com/idootop/mi-gpt/blob/main/docs/compatibility.md)
- 建议自行编译测试以确定您的设备最佳配置

**特别说明**：当前项目未对所有小爱音箱型号进行全面测试，以上型号支持情况仅供参考。由于小爱音箱型号众多，不同型号可能存在差异，建议用户根据自身设备型号自行编译测试。

**配置示例**：

```json
{
  "channels": {
    "migpt": {
      "userId": "123456789",
      "password": "your_password",
      "passToken": "your_pass_token",
      "devices": ["客厅音箱"],
      "speakerControl": "miot"
    }
  }
}
```

### 持续对话

启用 `keepAlive` 后，一次唤醒可连续对话，无需重复说"小爱同学"：

```json
{
  "channels": {
    "migpt": {
      "keepAlive": true,
      "keepAliveTimeout": 30,
      "keepAliveEnterKeywords": ["打开连续对话", "进入持续对话"],
      "keepAliveExitKeywords": ["关闭连续对话", "退出持续对话", "再见"]
    }
  }
}
```

**工作原理**：

- AI 回复后自动调用 MIoT 唤醒命令（`siid=5, aiid=3`）重新激活音箱麦克风
- 超时无新消息自动退出持续对话模式
- 支持语音关键词动态切换："打开连续对话" / "再见"

**抢答抑制**：收到新消息时立即暂停小爱原生回复，避免与 AI 回复冲突（借鉴 [MiGPT](https://github.com/idootop/mi-gpt) 的 `pause()` 机制）。

### MiMo 自定义 TTS

支持小米 [MiMo-V2.5-TT](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/speech-synthesis-v2.5) 语音合成，提供更自然的语音播报：

```json
{
  "channels": {
    "migpt": {
      "mimo": {
        "apiKey": "your-mimo-api-key",
        "model": "mimo-v2.5-tts",
        "voice": "冰糖",
        "style": "温柔活泼"
      }
    }
  }
}
```

**配置说明**：

| 字段 | 说明 | 默认值 |
| --- | --- | --- |
| `apiKey` | MiMo API Key（必填） | - |
| `model` | TTS 模型 | `mimo-v2.5-tts` |
| `voice` | 预设音色 ID | `mimo_default` |
| `style` | 风格指令 | - |

**可用音色**：

| 音色 | ID | 语言 | 性别 |
| --- | --- | --- | --- |
| 冰糖 | `冰糖` | 中文 | 女 |
| 茉莉 | `茉莉` | 中文 | 女 |
| 苏打 | `苏打` | 中文 | 男 |
| 白桦 | `白桦` | 中文 | 男 |
| Mia | `Mia` | 英文 | 女 |
| Chloe | `Chloe` | 英文 | 女 |

**风格示例**：`温柔`、`活泼`、`磁性`、`甜美`、`深沉`、`俏皮`、`东北话`、`四川话`

**工作原理**：流式调用 MiMo API 生成 PCM16 音频 → 转换为 WAV → 本地 HTTP 服务器托管 → 音箱播放。MiMo TTS 失败时自动回退到小米原生 TTS。

### 智能分流

插件自动区分对话和硬件控制命令：

- **纯对话**（小爱回复类型为 TTS/LLM 且仅有 1 条回答）→ 发送给 OpenClaw AI 处理
- **音乐播放**（小爱回复包含 TTS + Audio 多条回答）→ 由小爱原生处理
- **硬件控制**（开关灯、调节亮度、风扇/空调/加湿器等）→ 由小爱原生处理

无需额外配置，基于小米 API 返回的消息类型自动判断。

### 3. 启动服务

```bash
openclaw gateway restart
```

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

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

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
