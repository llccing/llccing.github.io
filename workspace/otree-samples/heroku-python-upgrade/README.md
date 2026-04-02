# oTree Heroku Python 升级指南

从 Python 3.9 迁移到 3.11+ 的完整步骤。

## 🔴 问题背景

Heroku 已停止支持 Python 3.9，旧 oTree 项目部署失败：

```
-----> Build failed
!     Python 3.9.16 has reached end-of-life
```

## ✅ 解决方案

### 方法一：使用 .python-version（推荐）⭐

```bash
# 1. 在项目根目录创建 .python-version
echo "3.11.0" > .python-version

# 2. 删除旧的 runtime.txt（如果有）
rm runtime.txt

# 3. 更新 oTree
pip install -U otree

# 4. 提交并部署
git add .python-version requirements.txt
git commit -m "chore: upgrade to Python 3.11"
git push heroku main
```

### 方法二：手动编辑 runtime.txt

```bash
# 1. 创建/修改 runtime.txt
echo "python-3.11.0" > runtime.txt

# 2. 告诉 oTree 不要覆盖
# 在 oTree Hub 界面选择"Don't overwrite runtime.txt"

# 3. 提交并部署
git add runtime.txt
git commit -m "chore: upgrade Python runtime"
git push heroku main
```

### 方法三：完全迁移到新 oTree Hub

```bash
# 1. 备份旧站点数据
otree export

# 2. 在新 oTree Hub 创建新站点

# 3. 导入数据
otree import < backup.json
```

## 📁 项目结构

```
heroku-python-upgrade/
├── .python-version          # Python 版本声明（推荐）
├── runtime.txt              # 旧方式（可选）
├── requirements.txt         # 依赖
├── settings.py              # 配置
├── Procfile                 # Heroku 部署配置
└── mygame/                  # 示例应用
    ├── __init__.py
    ├── models.py
    └── templates/
        └── mygame/
            └── Page.html
```

## 🚀 Heroku 部署

```bash
# 安装 Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# 登录
heroku login

# 创建应用
heroku create your-app-name

# 设置环境变量
heroku config set SECRET_KEY=$(openssl rand -hex 32)
heroku config set OTREE_PRODUCTION=1

# 部署
git push heroku main

# 查看日志
heroku logs --tail
```

## ⚠️ 常见问题

### Q1: oTree zip 仍然生成 Python 3.9

**问题**: `otree zip` 生成的 runtime.txt 还是 3.9.16

**解决**:
```bash
# 1. 删除 runtime.txt
rm runtime.txt

# 2. 确保 .python-version 存在
echo "3.11.0" > .python-version

# 3. 手动创建正确的 runtime.txt
echo "python-3.11.0" > runtime.txt

# 4. 部署时选择"Don't overwrite"
```

### Q2: 本地测试正常，Heroku 部署失败

**检查**:
1. `.python-version` 已提交到 git
2. `requirements.txt` 包含 `otree>=5.0.0`
3. Heroku 环境变量已设置

### Q3: 数据库迁移问题

```bash
# 重置数据库
heroku pg:reset DATABASE
heroku run otree reset_db
```

## 📖 相关资源

- [Heroku Python 支持](https://devcenter.heroku.com/articles/python-support)
- [oTree 部署文档](https://otree.readthedocs.io/en/latest/heroku.html)
- [Python 3.11 新特性](https://docs.python.org/3.11/whatsnew/3.11.html)

---

*原问题讨论：[oTree Forum #1437](https://www.otreehub.com/forum/1437/)*
