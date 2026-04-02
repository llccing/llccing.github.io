---
title: "解决 oTree Heroku Python 3.9 EOL 问题 - 完整迁移指南"
pubDatetime: 2026-03-20T13:00:00Z
draft: false
tags:
  - oTree
  - Heroku
  - Python
  - Tutorial
description: 详细解决 oTree 在 Heroku 部署时遇到的 Python 3.9 生命周期结束 (EOL) 问题，提供三种迁移方案。
---

## 问题背景

最近在 oTree Forum 上收到多个用户反馈：

> Old oTree Hub site stuck on Python 3.9 (Heroku EOL) – cannot create new site

用户在使用 2018-2019 年创建的老 oTree Hub 账户时遇到部署问题：

- **构建失败**: `Python 3.9.16 has reached end-of-life`
- **无法编辑**: oTree Hub 界面不允许修改 Python 版本
- **本地修改无效**: 修改 `runtime.txt` 后部署仍然失败
- **otree zip 问题**: 即使本地使用 Python 3.12，`otree zip` 生成的 runtime.txt 仍是 3.9.16

这个问题影响了多个长期使用 oTree 的研究者，导致他们的在线实验无法部署。

## 问题根源

### Heroku Python 支持政策

Heroku 定期停止支持老旧的 Python 版本：

| Python 版本 | Heroku 支持状态 |
|-------------|----------------|
| 3.9.x | ❌ 已停止 (2025) |
| 3.10.x | ⚠️ 安全更新 only |
| 3.11.x | ✅ 完全支持 |
| 3.12.x | ✅ 完全支持 |

### oTree 的版本问题

旧版 oTree (≤ 4.x) 在 `otree zip` 命令中硬编码了 Python 3.9.16：

```python
# otree 旧版本 zip.py
RUNTIME_TXT_CONTENT = 'python-3.9.16'  # 硬编码！
```

即使用户本地使用 Python 3.12，生成的部署包仍然包含旧的 runtime.txt。

## 解决方案

### 方案一：使用 .python-version（推荐）⭐⭐⭐⭐⭐

这是 oTree 5.0+ 推荐的方式。

**步骤**:

```bash
# 1. 在项目根目录创建 .python-version
echo "3.11.0" > .python-version

# 2. 删除旧的 runtime.txt（如果有）
rm runtime.txt

# 3. 升级 oTree 到最新版
pip install -U otree

# 4. 更新 requirements.txt
echo "otree>=5.0.0" > requirements.txt

# 5. 提交并部署
git add .python-version requirements.txt
git commit -m "chore: upgrade to Python 3.11"
git push heroku main
```

**为什么有效**:
- `.python-version` 是 Heroku 官方推荐的方式
- oTree 5.0+ 优先读取 `.python-version` 而非 `runtime.txt`
- 不会被 `otree zip` 覆盖

---

### 方案二：手动编辑 runtime.txt ⭐⭐⭐⭐

如果暂时不能升级 oTree，可以手动修改 runtime.txt。

**步骤**:

```bash
# 1. 创建/修改 runtime.txt
echo "python-3.11.0" > runtime.txt

# 2. 在 oTree Hub 界面选择"Don't overwrite runtime.txt"
# 这样 ot ree zip 不会覆盖你的修改

# 3. 提交并部署
git add runtime.txt
git commit -m "chore: upgrade Python runtime to 3.11"
git push heroku main
```

**注意**: 
- 每次 `otree zip` 后都要检查 runtime.txt
- 建议勾选"Don't overwrite"选项

---

### 方案三：完全迁移到新 oTree Hub ⭐⭐⭐

如果旧账户问题太多，可以考虑完全迁移。

**步骤**:

```bash
# 1. 备份旧站点数据
otree export > backup.json

# 2. 在新的 oTree Hub 账户创建站点

# 3. 导入数据
otree import < backup.json
```

**优点**:
- 全新的开始，没有历史包袱
- 自动使用最新的 Python 和 oTree 版本

**缺点**:
- 需要重新配置所有设置
- 旧的 Heroku 应用需要迁移或重建

---

## 完整示例项目

我们创建了一个完整的示例项目：[heroku-python-upgrade](https://github.com/The-Three-Fish/otree-samples/tree/main/heroku-python-upgrade)

**项目结构**:

```
heroku-python-upgrade/
├── .python-version          # Python 3.11.0
├── requirements.txt         # otree>=5.0.0
├── Procfile                 # Heroku 配置
├── settings.py              # oTree 设置
└── mygame/                  # 示例应用
    ├── __init__.py
    ├── models.py
    └── templates/
        └── mygame/
            └── Introduction.html
```

**快速测试**:

```bash
# 克隆示例
git clone https://github.com/The-Three-Fish/otree-samples.git
cd otree-samples/heroku-python-upgrade

# 安装依赖
pip install -r requirements.txt

# 本地运行
otree dev_server

# 访问 http://localhost:8000
```

---

## Heroku 部署完整流程

### 1. 安装 Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh
```

### 2. 登录并创建应用

```bash
# 登录
heroku login

# 创建应用
heroku create your-app-name
```

### 3. 设置环境变量

```bash
# 设置 SECRET_KEY（必需）
heroku config set SECRET_KEY=$(openssl rand -hex 32)

# 生产模式
heroku config set OTREE_PRODUCTION=1

# 管理员密码
heroku config set ADMIN_PASSWORD=your_secure_password
```

### 4. 部署

```bash
# 首次部署
git push heroku main

# 查看部署日志
heroku logs --tail

# 打开应用
heroku open
```

### 5. 数据库迁移

```bash
# 如果需要重置数据库
heroku pg:reset DATABASE
heroku run otree reset_db
```

---

## 常见问题

### Q1: oTree zip 仍然生成 Python 3.9

**问题**: 即使本地使用 Python 3.12，`otree zip` 还是生成 3.9.16

**解决**:
```bash
# 1. 确保使用 oTree 5.0+
pip install -U otree

# 2. 删除 runtime.txt
rm runtime.txt

# 3. 创建 .python-version
echo "3.11.0" > .python-version

# 4. 或者手动创建 runtime.txt
echo "python-3.11.0" > runtime.txt
```

### Q2: 部署成功但应用打不开

**检查**:
```bash
# 查看日志
heroku logs --tail

# 检查环境变量
heroku config

# 重启应用
heroku restart
```

### Q3: 本地测试正常，Heroku 失败

**可能原因**:
1. `.python-version` 未提交到 git
2. `requirements.txt` 版本太低
3. Heroku 环境变量未设置

**解决**:
```bash
# 确认文件已提交
git ls-files | grep -E "python-version|requirements"

# 重新设置环境变量
heroku config:set SECRET_KEY=xxx
heroku config:set OTREE_PRODUCTION=1
```

---

## 总结

| 方案 | 难度 | 推荐度 | 适用场景 |
|------|------|--------|----------|
| .python-version | 简单 | ⭐⭐⭐⭐⭐ | oTree 5.0+ |
| 手动 runtime.txt | 中等 | ⭐⭐⭐⭐ | 暂时不能升级 |
| 迁移新 Hub | 复杂 | ⭐⭐⭐ | 旧账户问题多 |

**最佳实践**:

1. **升级 oTree 到 5.0+** - 获得最新功能和安全修复
2. **使用 .python-version** - Heroku 官方推荐方式
3. **设置环境变量** - SECRET_KEY 等必需配置
4. **定期更新依赖** - `pip install -U otree`

---

## 需要帮助？

如果你在 oTree 开发或部署过程中遇到问题，欢迎：

- 访问 [xindamate.com](https://xindamate.com) 获取更多教程
- 在 [oTree Forum](https://www.otreehub.com/forum/) 提问
- 查看示例项目：[heroku-python-upgrade](https://github.com/The-Three-Fish/otree-samples)

---

*原文讨论：[oTree Forum #1437 - Old oTree Hub site stuck on Python 3.9](https://www.otreehub.com/forum/1437/)*
