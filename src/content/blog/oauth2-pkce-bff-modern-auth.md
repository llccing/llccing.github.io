---
pubDatetime: 2026-05-01T10:00:00Z
title: 从 OAuth 2.0 到 OAuth 2.1：PKCE、BFF 与现代前端认证的正确姿势
slug: oauth2-pkce-bff-modern-auth
featured: false
draft: false
tags:
  - oauth
  - security
  - nestjs
  - frontend
description: 回顾 2020 年 OAuth 2.0 方案的安全隐患，深入讲解 OAuth 2.1 的核心变化、PKCE 流程、BFF 模式，以及如何用 NestJS + Passport 构建安全的现代认证网关。
---

## 前言

2020 年，如果你在公司内部搜索 "前端登录接入 OAuth"，大概率会看到这样的方案：前端直接使用 Implicit Flow 获取 `access_token`，或者后端用 Resource Owner Password Credentials（密码凭证）模式直接换取令牌。这些方案在当时的教程里随处可见，但放到今天来看，它们都存在严重的安全隐患。

OAuth 2.1 草案（[draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)）将这些不安全的 Flow 明确移出推荐路径，并强化了 PKCE 的要求。与此同时，OAuth 2.0 Security BCP 也长期不再推荐这些旧方案。BFF（Backend For Frontend）架构模式因此越来越成为 SPA 应用的主流答案。

本文从实际问题出发，带你完整理解这套现代认证体系。

---

## 一、2020 年的方案为什么不够安全

### 1.1 Implicit Flow 的致命缺陷

Implicit Flow 的设计初衷是简化 SPA 的认证流程——直接在重定向 URL 的 fragment（`#`）中返回 `access_token`，省去后端换码这一步。

```
https://app.example.com/callback#access_token=eyJ...&token_type=Bearer&expires_in=3600
```

问题在于：

- **token 暴露在 URL 中**：浏览器历史记录、Referer 请求头、日志服务都可能记录这段 URL
- **无法验证令牌接收方**：任何拿到这个 token 的人都可以使用它
- **无 refresh_token**：Implicit Flow 规范上不允许颁发 refresh token，导致用户频繁重登

2019 年，OAuth 工作组发布了 [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)，明确建议**不再使用 Implicit Flow**。

### 1.2 密码凭证（ROPC）的问题

Resource Owner Password Credentials 模式让客户端直接收集用户名和密码，然后发给授权服务器换取 token：

```http
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=alice&password=secret123&client_id=my-app
```

这个模式的问题显而易见：**用户需要把密码交给第三方客户端**，从根本上违背了 OAuth 的初衷（OAuth 的核心价值就是让用户不必把密码给客户端）。在 OAuth 2.1 草案与 Security BCP 的语境下，这个 Flow 已不再推荐。

---

## 二、OAuth 2.1 的核心变化

OAuth 2.1 并不是全新的协议，而是对 OAuth 2.0 的一次"清理与加固"。主要变化：

| 变化点              | OAuth 2.0    | OAuth 2.1                            |
| ------------------- | ------------ | ------------------------------------ |
| Implicit Flow       | 允许         | **移除**                             |
| ROPC（密码凭证）    | 允许         | **移除**                             |
| PKCE                | 可选         | **Authorization Code Flow 强制要求** |
| redirect_uri        | 允许模糊匹配 | **要求精确匹配**                     |
| refresh token       | 可复用       | **推荐轮换（Rotation）**             |
| Bearer token in URL | 允许         | **禁止**                             |

现在，**所有客户端（包括公共客户端如 SPA）都应使用带 PKCE 的 Authorization Code Flow**。

---

## 三、PKCE 完整流程图解

PKCE（Proof Key for Code Exchange，[RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)）最初是为移动端 App 设计的，目的是防止授权码被拦截后滥用。现在它成了所有 OAuth 流程的标配。

### 3.1 核心原理

PKCE 在标准 Authorization Code Flow 的基础上，增加了一对随机生成的密钥：

- **code_verifier**：客户端随机生成的高熵字符串（43-128 字符）
- **code_challenge**：`BASE64URL(SHA256(code_verifier))`

### 3.2 完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│  浏览器（SPA）                                                    │
│  1. 生成 code_verifier = random(43-128 chars)                    │
│  2. code_challenge = BASE64URL(SHA256(code_verifier))            │
│  3. 跳转授权端点：                                               │
│     GET /authorize?                                              │
│       response_type=code                                         │
│       &client_id=my-spa                                          │
│       &redirect_uri=https://app.example.com/callback            │
│       &scope=openid profile email                                │
│       &state=random-csrf-token                                   │
│       &code_challenge=BASE64URL(SHA256(verifier))               │
│       &code_challenge_method=S256                                │
└────────────────────────┬────────────────────────────────────────┘
                         │ 用户登录并授权
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  授权服务器                                                       │
│  - 验证 code_challenge，存储                                     │
│  - 重定向回：                                                    │
│    https://app.example.com/callback?code=AUTH_CODE&state=...    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  浏览器收到 code，发起 token 请求：                               │
│  POST /token                                                     │
│    code=AUTH_CODE                                                │
│    &code_verifier=ORIGINAL_VERIFIER   ← 关键！授权服务器验证    │
│    &client_id=my-spa                                             │
│    &redirect_uri=https://app.example.com/callback               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                  返回 access_token + refresh_token + id_token
```

**关键安全保障**：即使攻击者拦截了 `AUTH_CODE`，没有 `code_verifier` 也无法换取 token，因为授权服务器会验证 `SHA256(code_verifier) === code_challenge`。

### 3.3 前端代码示例

```typescript
// pkce.ts — 浏览器端 PKCE 工具

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function initiateLogin(
  authServerUrl: string,
  clientId: string,
  redirectUri: string
) {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);

  // 存储到 sessionStorage（注意：不要存 localStorage，避免 XSS 窃取）
  sessionStorage.setItem("pkce_code_verifier", codeVerifier);
  sessionStorage.setItem("oauth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.href = `${authServerUrl}/authorize?${params}`;
}
```

---

## 四、OIDC 在前端的落地

OAuth 2.0 解决的是**授权**问题（你能做什么），而 OIDC（OpenID Connect）在其基础上解决的是**认证**问题（你是谁）。

OIDC 在 OAuth 2.0 的基础上增加了 `id_token`（一个 JWT）和 `userinfo` 端点。

### 4.1 id_token vs access_token

|                     | id_token           | access_token           |
| ------------------- | ------------------ | ---------------------- |
| **用途**            | 证明用户身份       | 访问资源服务器         |
| **受众（aud）**     | 客户端（你的 App） | 资源服务器（你的 API） |
| **谁来验证**        | 客户端自行验证签名 | 资源服务器验证         |
| **应该发给 API 吗** | **否！**           | 是                     |

一个常见的错误是把 `id_token` 发给后端 API 做鉴权。正确做法是：只把 `access_token` 发给 API，用 `id_token` 在前端解析用户信息。

### 4.2 userinfo 端点

```typescript
// 获取用户信息
const userInfo = await fetch("https://auth.example.com/userinfo", {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json());

// 返回类似：
// {
//   sub: "user-123",
//   name: "Alice",
//   email: "alice@example.com",
//   picture: "https://..."
// }
```

---

## 五、BFF（Backend For Frontend）模式

### 5.1 为什么 SPA 不应该持有 token

即使有了 PKCE，如果 `access_token` 和 `refresh_token` 存储在浏览器的 `localStorage` 或 `sessionStorage`，它们仍然面临 **XSS 攻击**的威胁。一旦页面被注入恶意脚本，攻击者就能读取这些 token。

BFF 模式的核心思路：**把 token 管理从浏览器移到服务器，浏览器只持有 HttpOnly Cookie 中的 session。**

```
┌──────────────────────────────────────────────────────────────┐
│  传统 SPA 架构                                                │
│                                                              │
│  Browser ──── access_token (localStorage) ──── API          │
│                                                              │
│  风险：XSS 可窃取 token                                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  BFF 架构                                                    │
│                                                              │
│  Browser ──── HttpOnly Cookie (session_id) ──── BFF Server  │
│                                                BFF Server ── token store ──── API
│                                                              │
│  Browser 永远看不到 token                                    │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 BFF 的职责

1. 处理 OAuth Authorization Code + PKCE 流程
2. 将换回的 token 存储在服务器内存或 Redis
3. 向浏览器返回 `HttpOnly; Secure; SameSite=Strict` 的 session cookie
4. 代理前端 API 请求，自动注入 Bearer token
5. 静默刷新 token（对浏览器完全透明）

---

## 六、NestJS + Passport 实现 BFF 认证网关

### 6.1 依赖安装

```bash
pnpm add @nestjs/passport passport passport-oauth2 openid-client express-session connect-redis
pnpm add -D @types/passport @types/express-session
```

### 6.2 OIDC Strategy

```typescript
// auth/oidc.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, TokenSet, UserinfoResponse } from "openid-client";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  constructor(
    client: any,
    private configService: ConfigService
  ) {
    super({
      client,
      params: {
        scope: "openid profile email",
        redirect_uri: configService.get("OIDC_REDIRECT_URI"),
      },
      usePKCE: true, // 开启 PKCE
    });
  }

  async validate(tokenSet: TokenSet, userinfo: UserinfoResponse) {
    // 这里可以将用户信息写入数据库，或做权限初始化
    return {
      sub: userinfo.sub,
      email: userinfo.email,
      name: userinfo.name,
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: tokenSet.expires_at,
    };
  }
}
```

### 6.3 Auth Controller

```typescript
// auth/auth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";

@Controller("auth")
export class AuthController {
  // 1. 发起登录 → 重定向到授权服务器
  @Get("login")
  @UseGuards(AuthGuard("oidc"))
  login() {
    // Passport 自动处理重定向，此处不需要实现
  }

  // 2. 授权服务器回调
  @Get("callback")
  @UseGuards(AuthGuard("oidc"))
  async callback(@Req() req: Request, @Res() res: Response) {
    // 用户信息已由 OidcStrategy.validate() 处理
    // Passport 将其挂到 req.user
    req.session["user"] = req.user;
    res.redirect("/");
  }

  // 3. 登出
  @Get("logout")
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  }

  // 4. 获取当前用户（供前端调用）
  @Get("me")
  me(@Req() req: Request) {
    const user = req.session["user"];
    if (!user) return { authenticated: false };
    // 注意：不要把 accessToken 返回给前端！
    return {
      authenticated: true,
      sub: user.sub,
      email: user.email,
      name: user.name,
    };
  }
}
```

### 6.4 API 代理中间件

```typescript
// proxy/api-proxy.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

@Injectable()
export class ApiProxyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.session?.["user"];
    if (!user?.accessToken) {
      throw new UnauthorizedException("Not authenticated");
    }

    // 将 access_token 注入到发往后端 API 的请求头
    const proxy = createProxyMiddleware({
      target: process.env.API_BASE_URL,
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
      on: {
        proxyReq: proxyReq => {
          proxyReq.setHeader("Authorization", `Bearer ${user.accessToken}`);
        },
      },
    });

    proxy(req, res, next);
  }
}
```

---

## 七、Refresh Token 轮换（Rotation）

OAuth 2.1 推荐 refresh token 使用轮换策略：每次使用 refresh token 刷新后，颁发新的 refresh token，并**使旧的失效**。

```typescript
// auth/token-refresh.service.ts
import { Injectable } from "@nestjs/common";
import { Issuer } from "openid-client";

@Injectable()
export class TokenRefreshService {
  async refreshTokens(refreshToken: string, client: any) {
    const tokenSet = await client.refresh(refreshToken);

    // 授权服务器返回新的 refresh_token（轮换）
    // 必须存储新的 refresh_token，旧的已经失效
    return {
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token, // ← 新的
      expiresAt: tokenSet.expires_at,
    };
  }
}
```

在 BFF 的 API 代理层，可以加入自动刷新逻辑：

```typescript
async function getValidAccessToken(session: any, client: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = 60; // 提前 60 秒刷新

  if (session.user.expiresAt - now < bufferSeconds) {
    // Token 即将过期，静默刷新
    const newTokens = await tokenRefreshService.refreshTokens(
      session.user.refreshToken,
      client
    );
    session.user = { ...session.user, ...newTokens };
  }

  return session.user.accessToken;
}
```

---

## 八、常见陷阱与最佳实践

### 8.1 CORS 与 Cookie

BFF 架构下，前端和 BFF 必须**同源**（或在允许凭证的跨源配置下）。如果前端是 `app.example.com`，BFF 是 `api.example.com`，需要：

```typescript
// NestJS CORS 配置
app.enableCors({
  origin: "https://app.example.com",
  credentials: true, // 允许携带 Cookie
});
```

前端 fetch 请求也需要带上 `credentials: 'include'`：

```typescript
fetch("/auth/me", { credentials: "include" });
```

### 8.2 Cookie 安全配置

```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS 无法读取，防 XSS
      secure: true, // 仅 HTTPS
      sameSite: "strict", // 防 CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 小时
    },
    store: redisStore, // 生产环境用 Redis
  })
);
```

### 8.3 State 参数防 CSRF

发起授权请求时务必带上随机 `state` 参数，并在 callback 时验证：

```typescript
// 发起时存储
sessionStorage.setItem("oauth_state", randomState);

// callback 时验证
const returnedState = new URLSearchParams(window.location.search).get("state");
if (returnedState !== sessionStorage.getItem("oauth_state")) {
  throw new Error("State mismatch — possible CSRF attack");
}
```

### 8.4 CSP 头部

添加 Content-Security-Policy 限制脚本来源，减少 XSS 注入面：

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  connect-src 'self' https://auth.example.com;
```

---

## 总结

| 场景                         | 推荐方案                             |
| ---------------------------- | ------------------------------------ |
| SPA + 公共客户端             | Authorization Code Flow + PKCE + BFF |
| 原生 App（iOS/Android）      | Authorization Code Flow + PKCE       |
| 服务间（Machine-to-Machine） | Client Credentials Flow              |
| 旧系统 Implicit Flow         | **立即迁移**                         |
| 旧系统 ROPC                  | **立即迁移**                         |

OAuth 2.1 并不是一次革命，而是把过去几年安全最佳实践正式写进规范。配合 PKCE 和 BFF，你的前端认证体系就能在 2026 年的安全标准下安心运行。

---

## 参考资料

- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) — IETF OAuth Working Group
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics) — Torsten Lodderstedt et al.
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636) — N. Sakimura et al.
- [The BFF Pattern](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps) — OAuth for Browser-Based Apps
- [NestJS Authentication Docs](https://docs.nestjs.com/security/authentication)
- [openid-client npm package](https://github.com/panva/node-openid-client)
