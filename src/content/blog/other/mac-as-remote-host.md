---
pubDatetime: 2026-08-10T20:00:00+08:00
title: "把 Mac 变成远程主机：家庭服务器的完整架构拆解"
slug: mac-as-remote-host
featured: false
draft: false
tags:
  - architecture
  - cloudflare
  - docker
description: 一台没有公网 IP 的 Intel MacBook Pro，如何承载一套带数据库、缓存、私有 Git、监控和云端 IDE 的完整服务？这篇从一个真实部署出发，拆解 Cloudflare Tunnel、Colima、Docker Compose、LaunchAgent 等每个组件在整体架构里的作用。
---

## 前言

最近做了一件事：把家里一台闲置的 Intel MacBook Pro 变成了家庭服务器的远程主机，跑起了自己的服务。整个过程比预想的顺利，也踩了几个值得记录的坑。

这篇文章不讲操作命令（那些都在 [xindarouter 仓库的部署文档](https://github.com/llccing/xindarouter/blob/main/docs/xindarouter-mac-deployment.md) 里），而是讲**架构**：这一整套系统由哪些组件组成，每个组件各自解决什么问题，数据从用户的浏览器一路走到数据库，中间经过哪些环节。

## 整体架构

先放一张全局图：

```text
用户浏览器
   │  https://router.rowanliu.com
   ▼
Cloudflare
   ├── DNS      域名解析，隐藏真实 IP
   ├── HTTPS    统一证书与加密
   └── Tunnel   无公网 IP 也能暴露内网服务
   │
   ▼
MacBook Pro 192.168.1.10（家庭局域网）
   ├── cloudflared          隧道客户端
   ├── Colima / Lima        容器运行时
   └── Docker Compose       容器编排
       ├── sub2api         主应用       127.0.0.1:8080
       ├── postgres        关系数据库   内部网络
       ├── redis           缓存         内部网络
       ├── uptime-kuma     监控看板     127.0.0.1:3001
       ├── gitea           私有 Git     127.0.0.1:3002
       ├── code-server     云端 IDE     127.0.0.1:8443
       └── xindarouter-dev AI 开发环境  127.0.0.1:8787
```

这套架构可以按职责切成四层，我逐层讲。

## 第一层：公网入口 —— Cloudflare

家庭宽带最大的限制是没有固定的公网 IP（即使有，运营商也会封 80/443 端口）。所以第一步要解决"别人怎么访问到我家里的电脑"。

我选择的是 Cloudflare Tunnel，它的工作方式完全不同于传统端口映射：

1. 家里这台 Mac 主动**向外**建立一个到 Cloudflare 的长连接（出站连接），不暴露任何入站端口。
2. Cloudflare 收到对 `router.rowanliu.com` 的请求后，通过这条已经建立的隧道，把流量转发到 Mac 上的 `127.0.0.1:8080`。
3. DNS 记录是 Cloudflare 控制的 proxied CNAME，指向隧道 ID 对应的 `*.cfargotunnel.com` 域名，所以家里主机真正的 IP 永远不会暴露。

Cloudflare 在这层一次性解决了三件事：

- **DNS**：`router.rowanliu.com` 这类域名直接托管在 Cloudflare。
- **HTTPS**：证书由 Cloudflare 统一签发和管理，Mac 上完全不用处理证书续期。
- **入站问题**：没有公网 IP、不用开路由器端口、不用动态 DNS，隧道客户端连出去就行。

隧道客户端就是 `cloudflared`，通过一个 token 文件认证并建立连接，进程由 launchd 守护。

## 第二层：宿主机 —— Mac 上的容器运行时

核心服务跑在 Docker 里。macOS 上跑 Docker 有两条路：

- **Docker Desktop**：图形界面，方便，但要钱（大企业授权）且占资源。
- **Colima + Lima**：命令行工具，轻量，通过 Lima 在 macOS 上启动一个 Linux 虚拟机，`colima start` 之后 `docker` 命令直接可用。

我选了 Colima。它的定位很清晰：**在 macOS 上提供一个标准的 Docker 兼容容器运行时**。Docker、Docker Compose 都装在这个 Linux VM 里，对外表现和服务器上的 Docker 完全一致，所以同一套 compose 文件既能跑在家里的 Mac，也能无缝迁到任何云主机。

一个小细节：所有工具（`colima`、`docker`、`cloudflared`）都装在用户目录 `~/.local/bin`，不依赖系统级安装，SSH 登录后需要先把该目录加进 `PATH`。

## 第三层：应用 —— Docker Compose 里的服务

这一层是系统的核心，用 Docker Compose 编排。关键在于**网络隔离**：所有服务共用一个内部网络，只有需要被公网访问的服务才映射到宿主机 `127.0.0.1`，而且只绑本机回环地址，绝不绑 `0.0.0.0`。

### sub2api —— 主应用（8080）

这是整个系统的主角。它对外暴露在 `127.0.0.1:8080`，由 Cloudflare Tunnel 指向，是唯一直接面对公网的服务。应用只绑本机回环地址，即使有人摸进局域网，也无法从别的机器直接访问它的端口。

### postgres —— 数据库

关系型数据库，存业务数据。它**不暴露任何端口到宿主机**，只通过内部网络和主应用通信。这是刻意为之：数据库是整套系统里最敏感的部分，能不透出网络就绝不透出。

### redis —— 缓存

缓存、会话、订阅计数这类需要高速读写的场景。启用了持久化（AOF）和密码认证，同样只在内部网络可见。

### uptime-kuma —— 监控看板（3001）

面向外部的服务就要有监控。Uptime Kuma 定时探测主应用、数据库和上游 API 的健康状态，挂了会在公网看板（`kuma.rowanliu.com`）和本地第一时间看到。它解决的是**可观测性**：系统出问题后，快速定位是公网入口挂了还是容器挂了。

### gitea —— 私有 Git 服务（3002）

在主应用之外，这套系统还承载了一个私有代码仓库。Gitea 解决了"代码放哪"的问题——敏感项目不用推到公网托管，存在家里这台机器上即可，SSH 和 HTTPS 都能用。

### code-server —— 云端 IDE（8443）

浏览器里打开的 VS Code。它把"开发环境"和"本地电脑"解耦：无论你在公司 Windows 上还是出差笔记本上，打开浏览器就是同一个工作区。这就是"把 Mac 当远程主机"最直接的用户体验——**人不必带着开发环境走，环境就固定在那里**。

### xindarouter-dev —— AI 开发环境（8787）

在 code-server 之上，还跑了一个 AI 开发控制台（OpenChamber）。它和 code-server 共享同一个工作区，容器里预装了 Claude Code、Codex、OpenCode 等命令行 AI 工具，相当于给这套远程主机加上了"用自然语言写代码"的能力。

## 第四层：运维 —— 自启动与备份

一台无人工值守的家庭服务器，最怕的不是坏，而是**重启之后没人把它拉起来**。

### launchd / LaunchAgent —— 自启动

macOS 用 `launchd` 管理后台进程。三个 LaunchAgent 分别守护：

- `xindarouter`：主应用栈（启动 Colima + Docker Compose）
- `xindarouter-tunnel`：cloudflared 隧道，`KeepAlive` 保证断了自动重连
- `xindarouter-backup`：每日备份

登录用户后自动运行。这是 macOS 版的 systemd，职责相同：**把服务进程变成操作系统管理下的常驻进程**。

### 备份脚本 —— 数据兜底

每日 `03:15` 跑一次 `mac-backup.sh`：`pg_dump` 导出数据库、打包应用数据目录、生成校验和，同时清理 14 天前的旧备份。备份在 Mac 本地目录，能防误删，但防不了 SSD 损坏，所以文档里也强调要定期把备份复制到机器之外。

## 数据是怎么走通的

把四层串起来，一次完整请求的路径是：

```text
浏览器
  → Cloudflare（DNS 解析 + HTTPS 卸载 + Tunnel 转发）
  → cloudflared（通过出站长连接接收请求）
  → sub2api 容器（127.0.0.1:8080）
  → postgres / redis（内部网络）
```

而运维链路是反方向的一条：

```text
Windows 开发机
  → SSH / VS Code Remote-SSH（登录 Mac）
  → 操作 launchd、Docker Compose、日志
  → 监控看板（uptime-kuma）负责告诉我系统还活着
```

两条链路互不干扰：公网链路只进主应用，运维链路只走 SSH 和局域网，这正是"纵深防御"的直观体现。

## 几个值得记住的设计决策

1. **用隧道而不是端口映射**：没有公网 IP，且隧道天然把服务藏在 Cloudflare 后面，主机 IP 不暴露，攻击面小很多。
2. **数据库不绑端口**：最敏感的数据只在内部网络，即使公网链路被攻破，数据库也不会直接暴露。
3. **用户态工具**：Colima、cloudflared 全装用户目录，SSH 登录即用，不污染系统级环境。
4. **同一套 compose 可移植**：因为容器运行时是标准 Docker，这套部署随时能从 Mac 平移到任何云主机，不被硬件绑架。
5. **远程开发环境与本地解耦**：code-server + 共享工作区，让"在哪里写代码"变得无所谓，这是远程主机最核心的价值。

## 局限

这套方案不是银弹，有它天然的边界：

- **单点风险**：所有服务在同一台 Mac 上，硬件坏了全部下线，备份在机器上也没用。
- **Mac 重启的坑**：用户级 LaunchAgent 要等登录界面出现后才运行，如果机器重启后停在登录页，服务起不来——需要配置自动登录或改成系统级服务。
- **合盖 / 休眠**：笔记本合盖休眠会直接断服务，需要 `pmset` 关掉电源下的睡眠。
- **性能天花板**：Intel i5 + 16GB，跑跑个人服务够用，扛不住正经生产流量。

## 结语

回头看，这套架构里没有什么是"必须"的高深技术——Cloudflare Tunnel、Colima、Docker Compose、launchd，都是被反复验证的成熟组件。真正的价值在于**组合**：用隧道解决公网访问，用容器统一运行时，用 launchd 解决常驻，用备份解决数据安全。当每个组件只解决一个问题、各司其职时，整套系统就变得可解释、可迁移、可维护。

这也正是"把一台旧电脑变成远程主机"最迷人的地方：硬件是旧的，但让整套系统运转起来的架构，是新的。

后续我又为这套系统加入了定时睡眠、唤醒、自愈和异地备份，完整记录见[《让家庭服务器按时睡觉、自动醒来：Mac 远程主机的生命周期管理》](/posts/mac-remote-host-lifecycle/)。
