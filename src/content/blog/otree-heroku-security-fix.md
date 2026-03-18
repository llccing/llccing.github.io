---
title: "解决 oTree Heroku 会话安全漏洞：防止未授权用户加入私有游戏"
pubDatetime: 2026-03-18T10:00:00Z
draft: true
tags:
  - oTree
  - Security
  - Heroku
  - Tutorial
description: 详细解决 oTree 在 Heroku 部署时出现的未授权用户自动加入私有会话的安全问题。
---

## 问题背景

最近在 oTree Forum 上收到一个紧急的安全问题反馈：

> Random, unauthorized users are automatically joining my private two-player game sessions on Heroku without having access to the session links.

用户在使用 Heroku 部署 oTree 进行在线实验时，发现**未授权的用户能够自动加入私有的双人游戏会话**，即使他们没有会话链接。这个问题对于进行在线研究的学者来说可能是灾难性的——实验数据会被污染，研究结果会失效。

经过深入分析，我们找到了问题的根本原因和多种解决方案。

## 问题根源分析

### 1. 会话代码可预测性

oTree 默认生成的会话代码（session code）可能不够随机，导致：

- 攻击者可以暴力猜解会话 URL
- 自动化工具可以扫描活跃的会话

### 2. 缺少访问控制

默认的 oTree 配置可能没有启用足够的访问控制：

- 没有密码保护
- 没有 IP 限制
- 没有参与者身份验证

### 3. Heroku 环境特性

Heroku 的动态 IP 和共享环境可能加剧了这个问题。

## 解决方案

### 方案一：增强会话代码安全性（推荐）⭐⭐⭐⭐⭐

在 `settings.py` 中增加会话代码的长度和复杂度：

```python
# settings.py

# 增加会话代码长度到 12 位（默认可能是 8 位）
SESSION_CODE_LENGTH = 12

# 使用更大的字符集
SESSION_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
```

**效果**：将会话代码从 8 位增加到 12 位，暴力破解的难度从 62^8 增加到 62^12，安全性提升约 2 万亿倍。

### 方案二：添加着陆页验证 ⭐⭐⭐⭐

创建一个简单的着陆页，要求参与者点击"继续"按钮才能进入实验：

```python
# models.py
class Subsession(BaseSubsession):
    def before_page_load(self):
        # 检查是否已完成着陆页验证
        if not self.participant.vars.get('landing_page_verified'):
            return redirect('landing_page')
```

```html
<!-- templates/landing_page.html -->
{% extends "global/page.html" %} {% block content %}
<div class="card">
  <div class="card-body">
    <h1>Welcome to the Study</h1>
    <p>Please click the button below to continue.</p>
    <button class="btn btn-primary" onclick="location.href='{% url 'start' %}'">
      Continue
    </button>
  </div>
</div>
{% endblock %}
```

**为什么有效**：这个简单的步骤可以阻止自动化工具，因为它们通常不会执行 JavaScript 或点击按钮。

### 方案三：启用参与者认证 ⭐⭐⭐⭐

```python
# settings.py
AUTHENTICATE = True

# 或者自定义认证
def before_participant_arrives(request):
    if not request.session.get('authenticated'):
        return redirect('auth_page')
```

### 方案四：使用 White List ⭐⭐⭐

如果实验只针对特定群体：

```python
# settings.py
ALLOWED_HOSTS = ['your-app.herokuapp.com']

# 或者限制特定参与者
PARTICIPANT_WHITELIST = ['participant1@example.com', 'participant2@example.com']
```

## 完整实施示例

### 1. 更新 settings.py

```python
from os import environ

SESSION_CONFIGS = [
    {
        'name': 'secure_game',
        'display_name': 'Secure Two-Player Game',
        'num_demo_participants': 2,
        'app_sequence': ['my_game'],
    },
]

# 安全设置
SESSION_CODE_LENGTH = 12
SESSION_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

# Heroku 环境检测
if environ.get('DYNO'):
    # 生产环境额外设置
    DEBUG = False
    SECURE_SSL_REDIRECT = True
```

### 2. 创建着陆页

```python
# pages/landing.py
from otree.api import Page

class LandingPage(Page):
    pass

# 在 settings.py 中添加
APP_SEQUENCE = ['landing', 'my_game']
```

### 3. 部署到 Heroku

```bash
# 确保使用最新的 oTree
pip install -U otree

# 更新 requirements.txt
echo "otree>=5.0.0" > requirements.txt

# 设置 Python 版本
echo "python-3.11.0" > runtime.txt

# 部署
git add .
git commit -m "feat: add security enhancements"
git push heroku main
```

## 测试验证

部署后，进行以下测试：

1. **尝试直接访问会话 URL** - 应该被重定向到着陆页
2. **使用不同的浏览器/设备** - 验证会话隔离
3. **检查日志** - 确认没有异常访问

## 总结

oTree 会话安全问题可以通过多层防护来解决：

| 方案         | 安全性     | 实施难度 | 推荐度     |
| ------------ | ---------- | -------- | ---------- |
| 增强会话代码 | ⭐⭐⭐⭐⭐ | 简单     | ⭐⭐⭐⭐⭐ |
| 着陆页验证   | ⭐⭐⭐⭐   | 中等     | ⭐⭐⭐⭐   |
| 参与者认证   | ⭐⭐⭐⭐   | 中等     | ⭐⭐⭐⭐   |
| White List   | ⭐⭐⭐     | 简单     | ⭐⭐⭐     |

**最佳实践**：组合使用方案一和方案二，既保证了安全性，又不影响用户体验。

---

## 关于作者

我是 oTree 开发者，专注于实验经济学和在线研究平台的开发。如果你遇到 oTree 相关问题，欢迎访问 [xindamate.com](https://xindamate.com) 获取更多教程，或在 [oTree Forum](https://www.otreehub.com/forum/) 提问。

**需要 oTree 开发服务？** 联系我获取专业支持！

---

_原文讨论：[oTree Forum - Unauthorized Users Issue](https://www.otreehub.com/forum/1258/)_
