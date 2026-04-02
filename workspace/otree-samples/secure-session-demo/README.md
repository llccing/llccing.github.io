# oTree Secure Session Demo

演示如何配置 oTree 以防止未授权用户加入私有会话。

## 🔒 安全增强功能

这个示例展示了以下安全措施：

### 1. 增强的会话代码配置

在 `settings.py` 中：

```python
# 增加会话代码长度到 12 位（默认 8 位）
SESSION_CODE_LENGTH = 12

# 使用完整的字符集（62 个字符）
SESSION_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
```

**安全性提升**：
- 默认 8 位：62^8 ≈ 218 万亿种可能
- 增强 12 位：62^12 ≈ 3.2 亿亿亿种可能
- **提升约 2 万亿倍**

### 2. 参与者追踪

每个参与者都有：
- 唯一的 participant ID
- 验证码（verification code）
- 时间戳记录

### 3. 可选的安全措施

在 `settings.py` 中启用：

```python
# 启用参与者认证
AUTHENTICATE = True

# 设置会话密码
SESSION_CONFIG_DEFAULTS = {
    'session_password': 'your_secure_password',
}

# 禁用自动继续（防止意外加入）
CONTINUE_UNIQUE_PARTICIPANT_NAME = False
```

## 🚀 如何运行

### 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 运行开发服务器
otree devsettings
```

访问 http://localhost:8000

### Heroku 部署

1. 创建 Heroku 应用
2. 设置环境变量
3. 部署

```bash
# 安装 Heroku CLI
heroku create your-app-name

# 设置 oTree 配置
heroku config set OTREE_PRODUCTION=1
heroku config set SECRET_KEY=$(openssl rand -base64 32)

# 部署
git push heroku main
```

## 📁 项目结构

```
secure-session-demo/
├── settings.py              # 包含安全配置
├── requirements.txt
├── secure_game/
│   ├── __init__.py
│   ├── models.py            # 包含安全检查逻辑
│   └── templates/
│       └── secure_game/
│           ├── Introduction.html
│           ├── TaskPage.html
│           └── ResultsPage.html
└── README.md
```

## 📖 相关资源

- [oTree 官方文档](https://otree.readthedocs.io/)
- [Heroku 部署指南](https://otree.readthedocs.io/en/latest/heroku.html)
- [Blog 教程](https://xindamate.com/blog/otree-heroku-security-fix/) (待发布)

## ⚠️ 注意事项

1. **生产环境务必使用 HTTPS**
2. **定期更新 oTree 版本**
3. **监控异常访问**
4. **不要硬编码敏感信息**

## 📝 License

MIT License
