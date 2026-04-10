---
pubDatetime: 2026-04-10T00:00:00Z
title: "从自研到开源：使用 Prometheus 实现可扩展的网络探测与 HTTP/3 就绪"
slug: slack-network-probing-prometheus
featured: false
draft: false
tags:
  - infrastructure
  - prometheus
  - http3
  - translation
description: "本文翻译自 Slack 工程博客，介绍了 Slack 如何从自研网络探测系统迁移到 Prometheus Blackbox Exporter，并扩展支持 HTTP/3 (QUIC) 探测的全过程。"
---

> 原文：[From Custom to Open: Scalable Network Probing and HTTP/3 Readiness with Prometheus](https://slack.engineering/from-custom-to-open-scalable-network-probing-and-http-3-readiness-with-prometheus/)
> 作者：Amir Reza Asadi
> 日期：2025 年 3 月 18 日

## 引言

在 Slack，我们依赖强大的网络基础设施为数百万用户提供无缝的实时通信服务。监控网络的健康状况和性能至关重要，多年来我们一直使用自研的网络探测系统来实现这一目标。然而，随着基础设施的不断扩展，我们需要一个更具可扩展性、更易维护且更加开放的解决方案。

在这篇博文中，我们将分享从自研网络探测系统迁移到 Prometheus Blackbox Exporter 的历程，以及我们如何扩展它以支持 HTTP/3 (QUIC) 探测——这是我们 HTTP/3 就绪计划中的关键一步。

## 旧系统

我们之前的网络探测系统是一个自研方案，用于对基础设施进行健康检查。虽然它在初期表现良好，但存在以下几个局限性：

- **可扩展性挑战：** 随着基础设施的扩展，系统难以应对不断增长的探测数量。
- **维护负担：** 作为自研方案，需要专门的工程投入来维护和扩展。
- **有限的可观测性：** 系统的指标难以与我们更广泛的监控体系集成。
- **不支持 HTTP/3：** 该系统在 HTTP/3 成为优先事项之前就已构建，添加支持需要大量重构。

## 为什么选择 Prometheus Blackbox Exporter？

我们选择 Prometheus Blackbox Exporter 有以下几个原因：

1. **开源且社区驱动：** 活跃的社区支持和定期更新。
2. **原生 Prometheus 集成：** 与我们现有的 Prometheus 监控体系无缝集成。
3. **多协议支持：** 内置 HTTP、TCP、DNS、ICMP 和 gRPC 探测支持。
4. **可扩展性：** 模块化架构使得添加 HTTP/3 支持成为可能。
5. **经过大规模验证：** 被许多大型组织用于网络监控。

## 迁移策略

我们的迁移采用了分阶段的方式：

### 第一阶段：并行运行

我们同时运行旧系统和 Blackbox Exporter，对比结果以确保一致性。这让我们确信新系统能够满足需求。

### 第二阶段：配置迁移

我们将现有的探测配置转换为 Blackbox Exporter 基于 YAML 的配置格式。以下是一个基本 HTTP 探测配置的示例：

```yaml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: []  # 默认为 2xx
      method: GET
      follow_redirects: true
      preferred_ip_protocol: "ip4"
```

### 第三阶段：切换

在验证结果之后，我们逐步将流量从旧系统转移到 Blackbox Exporter，最终下线了旧系统。

## 添加 HTTP/3 支持

基础迁移完成后，我们将注意力转向 HTTP/3 就绪。HTTP/3 基于 QUIC 构建，提供了显著的性能改进，包括减少连接建立时间和更好地处理丢包。

### 挑战

Prometheus Blackbox Exporter 原生不支持 HTTP/3 探测。我们需要对其进行扩展以实现：

1. 与目标端点建立 QUIC 连接。
2. 执行 HTTP/3 请求并验证响应。
3. 暴露相关指标（连接时间、TLS 握手时长等）。

### 我们的实现

我们利用 `quic-go` 库为 Blackbox Exporter 贡献了 HTTP/3 支持。主要变更包括：

- 为 HTTP/3 添加新的 `http_version` 选项
- 实现 QUIC 传输层集成
- 暴露 QUIC 特定的指标

以下是 HTTP/3 探测的配置示例：

```yaml
modules:
  http3_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/3.0"]
      valid_status_codes: []
      method: GET
      preferred_ip_protocol: "ip4"
```

### 暴露的指标

HTTP/3 探测暴露了以下几个有用的指标：

- `probe_http_duration_seconds{phase="connect"}` — QUIC 连接建立时间
- `probe_http_duration_seconds{phase="tls"}` — TLS 1.3 握手时长（QUIC 的一部分）
- `probe_http_duration_seconds{phase="transfer"}` — 响应传输时间
- `probe_http_version` — 确认使用了 HTTP/3
- `probe_success` — 整体探测成功/失败

## 扩展方案

为了应对 Slack 的规模，我们实施了以下几项优化：

- **分片探测：** 将探测分布到多个 Blackbox Exporter 实例中，避免瓶颈。
- **动态目标发现：** 与我们的服务发现系统集成，自动更新探测目标。
- **告警集成：** 将探测结果接入告警流水线，实现快速事件响应。

## 成果

此次迁移带来了显著的改进：

- 探测基础设施维护工作量**减少 40%**
- 通过原生 Prometheus/Grafana 集成实现**统一可观测性**
- 在边缘基础设施上验证了 **HTTP/3 就绪**状态
- 通过改进的指标粒度实现**更快的事件检测**
- **社区贡献** — 我们的 HTTP/3 变更已向更广泛的 Prometheus 社区开放

## 结论

从自研网络探测系统迁移到 Prometheus Blackbox Exporter，并扩展 HTTP/3 支持，对 Slack 的基础设施团队来说是一次重大胜利。通过拥抱开源工具，我们降低了维护负担，提升了可观测性，并为 Web 协议的未来做好了准备。

我们鼓励面临类似挑战的其他组织考虑为开源项目做贡献，而不是构建自研方案。社区协作的收益远远超过初始投入。
