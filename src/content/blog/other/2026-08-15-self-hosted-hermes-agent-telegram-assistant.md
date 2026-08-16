---
title: "第三步：给家庭服务器装上会自己长大的 AI 助理"
slug: self-hosted-hermes-agent-telegram-assistant
pubDatetime: 2026-08-15T14:45:00+08:00
description: 前两篇把一台旧 Mac 变成了远程主机、跑起了全套服务，这篇是第三步：出门在外时，怎么用 Telegram 指挥这台服务器干活。拆解 Hermes Agent 的选型、出站轮询架构、以及国内网络环境下三个真实的坑。
tags: ["Self-hosted", "AI Agent", "Hermes", "Telegram", "Docker"]
draft: false
---

## 前言

上一篇（[把 Mac 变成远程主机](https://rowanliu.com/posts/mac-as-remote-host/)）讲了怎么把家里一台闲置的 Intel MacBook Pro 变成家庭服务器：Cloudflare Tunnel 解决公网入口，Colima + Docker Compose 统一运行时，uptime-kuma 盯着系统活着。这套架构解决了一个核心问题——**服务在跑**。

但用了一段时间，我意识到还缺一个环节：**人在不在电脑前都能指挥它**。

- 人在电脑前，有桌面端 AI 干活（写文档、改代码）；
- 服务出问题，可以用远程控制软件接管屏幕手动修；
- 但**出门在外**、只想"查一下容器状态 / 看看监控 / 跑个命令"时，这两条路都太重了——为一条命令打开远程桌面，是杀鸡用牛刀。

这篇是第三步：给这台服务器装一个能通过 Telegram 指挥、并且会自己长大的 AI 助理（Hermes Agent）。

## 选型：两条路线的选择

2026 年这个赛道有两个代表性选手，恰好代表了两种设计哲学：

| 维度     | OpenClaw                     | Hermes Agent（Nous Research） |
| -------- | ---------------------------- | ----------------------------- |
| 定位     | 执行派：稳定、生态大         | 进化派：自学、记忆深          |
| 内置记忆 | 无，需手动维护               | 三层记忆（SQLite + 用户画像） |
| 技能生态 | ClawHub 5.2 万+              | 40+ 开箱，用完自动沉淀        |
| 资源占用 | 官方要求 ≥2GB 内存           | 实测 RSS ~164MB               |
| 风险     | 供应链 RCE 前科 + 市场泄凭据 | pre-1.0，较耗 token           |

我的需求是"还没想好用途、希望越用越懂我"的个人助理——这正中 Hermes 的定位。而且 OpenClaw 还没部署，零迁移成本，自然选后者。

> 一个容易踩的坑：OpenClaw 生态里有个第三方插件也叫 `hermes-agent`（学习 skill），和 Nous Research 的独立产品**同名不同物**，网上资料经常混淆。

## 整体架构

先放一张全局图：

```text
Telegram（手机 · 人在外面）
   │  出站长轮询（bot 主动连 Telegram 服务器）
   ▼
代理（clash verge :7890 —— Telegram API 国内被墙）
   │  host.lima.internal:7890
   ▼
MacBook Pro（家庭局域网）
   └── Colima VM
       └── Docker Compose
           └── hermes-agent        网关 + 工具链 + 记忆
               │  OpenAI 兼容 API（国内直连）
               ▼
           hi-code.cc 中转 → grok-4.6（默认模型）
```

这套架构和第一步有一个**相同的核心认知**：Telegram 通道是出站长轮询（bot 主动连 Telegram 服务器），不是入站 webhook——所以它**不需要任何公网入站端口**，Cloudflare Tunnel 在这里完全用不上。暴露面为零，攻击面反而比 Web 服务更小。

代价是有一个**硬依赖**：Telegram API 在国内被墙，bot 必须走代理。这成了整篇最折腾的部分。

## 第一坑：容器内 DNS 解析不了 .cc 域名

配置模型端点后，`curl` 测试 `https://www.hi-code.cc/v1/models` 时通时不通，最后稳定报 `Could not resolve host`。宿主机 `dig` 完全正常（返回 Cloudflare CDN IP），容器内却解析失败——国内 DNS 环境 + 容器 DNS 转发的不稳定组合。

解法是绕过 DNS，在 compose 里直接绑 IP：

```yaml
extra_hosts:
  - "host.lima.internal:host-gateway"
  - "www.hi-code.cc:172.67.167.55"
```

## 第二坑：401 Missing Authentication header —— auto 探测的误导

`provider: "custom"` + `base_url` + `api_key` 都配好后，请求仍然 401。排查半天，根因很有意思：**我在 `.env` 里设置了 `OPENROUTER_API_KEY`**（以为 custom provider 会回退读取）。结果 Hermes 的 auto 探测看到这个变量，误判要走 OpenRouter 分支——拿着 hi-code 的 key 去请求 openrouter 官方端点，当然 401。

解法：`.env` 里**不要**设 `OPENROUTER_API_KEY` / `OPENAI_API_KEY`，key 只放 `config.yaml` 的 `model.api_key`，provider 固定 `custom`：

```yaml
model:
  provider: "custom"
  base_url: "https://www.hi-code.cc/v1"
  default: "grok-4.6"
  api_key: "sk-..." # 放这里，不放 .env
```

> 顺带发现：CLI 的 `-z` 单次模式强制走 auto 探测，会报 "No LLM provider configured"；但 gateway（Telegram 实际路径）和交互 `chat` 模式都正常读 config。别被测试命令误导。

## 第三坑：docker logs 的假象

Telegram 连接日志在 `docker logs` 里永远卡在 `Connecting to Telegram (attempt 1/8)…`，看着像没连上——其实是容器 stdout 缓冲滞后。真实状态要看数据目录里的 `logs/gateway.log`，那里会明确写 `✓ telegram connected` 和 60 个命令注册成功。

## 记忆：让助理从第一天就认识你

Hermes 的记忆是分层持久化的。部署完成后，我把服务器的环境画像直接写进了它的记忆目录：

- `USER.md` —— 用户画像：谁在用、用什么语言、作息规律（22:00–05:00 这台机器会睡觉）、凭据铁律
- `MEMORY.md` —— 环境记忆：服务架构、代理端口、DNS 坑、模型端点的位置

这样它从第一次对话起就知道：夜间别指望它、Telegram 走代理、API key 不进文档。**不用重新教**，这就是"会成长"的起点。

## 几个值得记住的设计决策

1. **出站轮询代替入站 webhook**：Telegram 通道不需要公网端口，暴露面为零，与第一步的 Tunnel 思路一脉相承——能不出站就不出站，能不出入站端口就不出。
2. **代理只服务 Telegram，LLM 走直连**：全局代理置空，只给 Telegram 通道单独指代理；国内可达的模型端点进 `NO_PROXY`。避免 LLM 请求被代理绕路超时。
3. **DNS 不稳定的环境用 hosts 兜底**：容器内解析不可信时，compose `extra_hosts` 绑 IP 是最省心的兜底，比折腾 DNS 配置可控得多。
4. **凭据只进两个地方**：`.env`（600 权限）和 `config.yaml`，绝不进文档、不进 git、不进聊天记录——和整个家庭服务器的凭据铁律一致。
5. **内存很轻才是可持续的**：实测 RSS ~164MB，对这台 16GB 的旧 Mac 几乎无感。选型时"资源占用"必须当作一等公民，尤其跑在旧硬件上。

## 局限

- **pre-1.0**：Hermes 还在快速迭代（v0.18），升级要备份数据目录再动。
- **token 比 OpenClaw 费**：自学闭环的代价是推理开销更大，个人使用量小所以无所谓，但要留意用量看板。
- **代理是单点**：clash 挂了，Telegram 通道就断了（Hermes 会自动重连，但连不上就是连不上）。
- **作息边界**：这台 Mac 每天 22:00–05:00 睡觉，助理跟着睡——它是个"白天助理"，不是 7x24 的客服。想要夜间报告，就得用它的 cron 在 05:30 醒来后补发。

## 结语

回头看，这一步的技术含量其实不高——一个 Docker 容器、一个 bot token、一个 OpenAI 兼容端点。真正的价值在于**组合**：用 Telegram 解决"人在外面"的入口，用出站轮询解决"不需要公网端口"的安全，用代理隔离解决"国内网络"的限制，用分层记忆解决"越用越懂你"的成长性。

这也正是把旧电脑折腾成服务器的迷人之处：**硬件是旧的，但让它长出"助理"的架构，是新的；而这个助理，还会随着使用变得越来越懂你。**
