---
pubDatetime: 2026-04-09T09:00:00+08:00
title: "[译] 从定制到开放：使用 Prometheus 实现可扩展的网络探测与 HTTP/3 就绪性检查"
slug: slack-network-probing-http3-prometheus
featured: false
draft: false
tags:
  - translation
  - infrastructure
  - networking
  - observability
  - open-source
  - golang
description: "Slack 工程团队如何通过为 Prometheus Blackbox Exporter 贡献 QUIC/HTTP3 支持，解决了 HTTP/3 迁移过程中的可观测性缺口。"
---

> **原文信息**
>
> - 原文链接：[From Custom to Open: Scalable Network Probing and HTTP/3 Readiness with Prometheus](https://slack.engineering/from-custom-to-open-scalable-network-probing-and-http-3-readiness-with-prometheus/)
> - 作者：Rafael Elvira（Staff Software Engineer）、Sebastian Feliciano（Software Engineer Intern）、Carlo Preciado（Software Engineer） — Slack Infrastructure 团队
> - 发布日期：2026 年 3 月 31 日
> - 版权归原作者及 Slack Technologies, LLC 所有，本文为中文翻译，仅供学习交流。

---

## 问题所在：遗留工具及其局限性

目前，Slack 采用混合方式进行网络测量，包含**内部**（如 AWS 可用区之间的流量）和**外部**（监控从公共互联网进入 Slack 基础设施的流量）解决方案。这些工具由商业 SaaS 产品和我们内部团队多年来自建的网络测试方案组合而成。这套方案在很长一段时间内满足了我们的需求。

当我们开始在边缘节点推进 HTTP/3 支持时，遇到了一个重大挑战：**缺乏客户端侧的可观测性。**

由于 HTTP/3 基于 [QUIC](https://en.wikipedia.org/wiki/QUIC) 传输协议构建，它使用 [UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol) 而非传统的 TCP。这一向新传输协议的根本性转变意味着，现有的监控工具和 SaaS 解决方案**无法**对我们新的 HTTP/3 端点进行探测和指标采集。

当时，市场上存在一个巨大的空白：

- 我们调研过的所有 SaaS 可观测性工具，**没有一个**原生支持 HTTP/3 探测。
- 作为我们监控基石的内部 Prometheus [Blackbox Exporter (BBE)](https://github.com/prometheus/blackbox_exporter)，也没有对 QUIC 的原生支持。

如果无法对新基础设施中数十万个 HTTP/3 端点进行探测，我们就无法获得所需的客户端侧可见性——既无法监控 HTTP/2 的回退情况，也无法获得准确的往返时间（RTT）测量数据。

## 实习生的突破性贡献

### 开源贡献

我们的实习生 Sebastian Feliciano 独立完成了 Prometheus BBE 的 QUIC 支持的范围界定、实现以及最终的开源发布。

**选择合适的 HTTP 客户端**：第一步是选择一个支持 QUIC 的 HTTP 客户端。经过仔细评估，他选择了 `quic-go` 作为新功能的基础。选定这个库的原因是它在其他开源技术中被广泛采用，并且在 Go 语言中创建 HTTP 客户端方面提供了一流的支持。

以下是 Sebastian 将 `quic-go` 集成到 BBE HTTP 客户端的方式：

```go
http3Transport := &http3.Transport{
    TLSClientConfig: tlsConfig,
    QUICConfig:      &quic.Config{},
}

client = &http.Client{
    Transport: http3Transport,
}
```

**保持可组合性**：Sebastian 需要在遵循 Blackbox Exporter 现有架构的前提下添加这套新逻辑，确保新功能维持该工具原有的配置模式。

这项工作的成果是在 Prometheus 中实现了一个功能完备且可配置的 HTTP/3 探测器。通过将贡献开源，他为整个 Prometheus 社区提供了一个通用的解决方案。Sebastian 通过遵循既有模式并赢得社区认可，成功合并了 HTTP/3 功能。

### 最后一步：集成

作为一名实习生，能够做出开源贡献本身就是一项巨大的成就。我们很多人都知道，维护者不会总是快速合并 PR，尤其是对于新功能。Sebastian 的实习期有限，他等不起。于是他自己动手，架构了一套内部系统，利用上游的新功能来探测 HTTP/3 端点。

## 运维改进

**统一视图**：我们现在在 Grafana 中拥有了 HTTP/1.1、HTTP/2 和 HTTP/3 指标的统一视图，可以更方便地与其他遥测数据进行关联和对比。

**更好且更可靠的告警**：借助新的探测器，我们可以针对 HTTP/3 端点的健康状况和性能创建更可靠的告警。

**更容易的关联分析**：将所有数据集中在一处，使得将 HTTP/3 性能与其他指标进行关联变得更加容易，问题排查也更快速。

## 开源的胜利

**社区受益**：这一贡献惠及更广泛的 Prometheus 社区，帮助其他面临同样 HTTP/3 适配挑战的组织。通过构建这一支持，我们已经为 QUIC 和 HTTP/3 的持续采用做好了可观测性方面的前瞻性准备。

## 展望未来

虽然这是一个重要的里程碑，但我们的工作尚未结束。未来可能的改进方向包括：

- **[服务器名称指示](https://en.wikipedia.org/wiki/Server_Name_Indication)（SNI）路由测试** — 验证 SNI 扩展是否被我们的边缘基础设施正确处理。这确保当客户端通过共享 IP（如 CDN 或多租户负载均衡器）请求特定主机名时，网关能正确路由流量到目标后端，并提供匹配的 SSL 证书，防止路由错误。
- **端到端路径可视化** — 不再局限于简单的"在线/离线"检查，而是逐跳映射从监控代理到服务端点的整个网络路径。这提供了网络路径的可视化表示，使精确定位延迟尖峰或丢包位置成为可能。

我们邀请社区中的其他人尝试 Prometheus Blackbox Exporter 中的这一新 QUIC 支持，并与我们一起构建下一代可观测性工具。您可以在 Prometheus Blackbox Exporter 仓库的[配置文档](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)中找到 HTTP/3 的配置说明。

## 结论

这个项目带来了几个重要启示：

### 1. 先监控，后迁移

这应该是不言而喻的，但将可观测性作为迁移的前提条件做好，能让一切都更快。我们知道业界正在向 QUIC 迈进，但向自己证明这在长期来看是正确的方向，才能让我们更有信心加大对其未来的投入。

### 2. 贡献开源回报丰厚

回馈给我们带来如此多帮助的开源社区，这种感觉很好。当像 QUIC 这样具有变革性的协议出现，而现有技术存在支持空白时，当我们填补这个空白，所有人都赢了；而当所有人决定长期支持它时，我们也赢了。

### 3. 押注你的实习生

我们非常幸运能让 Sebastian 加入我们的团队担任实习生。他在解决问题时的主动性和创造力帮助我们推动了 QUIC 迁移的落地，并让我们切实体验到了黑盒监控的好处。

---

从可观测性缺口到开源解决方案，这段旅程完美地体现了我们对简洁性和可扩展性的追求。随着 HTTP/3 在全行业的采用不断增长，我们致力于让监控工具始终走在前沿。我们欢迎社区的反馈和贡献，共同推动这些能力的持续演进。
