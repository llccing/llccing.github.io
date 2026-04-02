# GitHub Issues 模板

由于当前 GitHub token 只有 pull 权限，请 Rowan 手动创建以下 Issues：

---

## Issue 1: [oTree Forum #1258] 未授权用户加入私有会话 - 安全问题

**Labels**: `otree-forum`, `security`, `high-priority`

**Body**:
```markdown
## 📋 问题信息
- **标题**: Unauthorized Users Automatically Joining Private Game Sessions on Heroku Platform
- **链接**: https://www.otreehub.com/forum/1258/
- **作者**: chonghaopeng
- **发布时间**: 2026-03-15
- **回复数**: 5

## 📝 问题描述
Random, unauthorized users are automatically joining my private two-player game sessions on Heroku without having access to the session links.

用户在进行在线实验时，发现未授权用户能够自动加入私有的双人游戏会话，即使他们没有会话链接。

## 🔍 技术分析

### 可能原因
1. **会话代码可预测** - 默认 8 位代码容易被暴力破解
2. **缺少访问控制** - 没有密码或身份验证
3. **Heroku 环境特性** - 动态 IP 和共享环境

### 已有回复
- @BonnEconLab 建议使用着陆页验证
- 用户确认是因为自己通过 email/WhatsApp 发送链接导致的

## 💡 建议方案

### 方案 1: 增强会话代码安全性
```python
# settings.py
SESSION_CODE_LENGTH = 12
SESSION_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
```

### 方案 2: 添加着陆页验证
创建简单的 landing page，要求点击"Continue"才能进入实验

### 方案 3: 启用参与者认证
```python
AUTHENTICATE = True
```

## 📊 评估
- 技术难度：⭐⭐⭐
- 商业价值：💰💰💰💰（安全问题，预算通常较高）
- Blog 价值：📝📝📝📝📝（所有 oTree 开发者都关心）
- 紧急程度：🔥🔥🔥🔥

## ✅ 下一步
- [x] AI 分析完成
- [ ] Rowan 确认解决方案
- [ ] 准备 Forum 回复
- [ ] 创建 Blog 文章（草稿已完成：`otree-heroku-security-fix.md`）
- [ ] Forum 回复并附上 Blog 链接
```

---

## Issue 2: [oTree Forum #1437] Heroku Python 3.9 EOL 迁移问题

**Labels**: `otree-forum`, `heroku`, `migration`

**Body**:
```markdown
## 📋 问题信息
- **标题**: Old oTree Hub site stuck on Python 3.9 (Heroku EOL) – cannot create new site
- **链接**: https://www.otreehub.com/forum/1437/
- **作者**: [待确认]
- **发布时间**: 2026-03-16

## 📝 问题描述
用户的旧 oTree Hub 站点卡在 Python 3.9，但 Heroku 已经停止支持 Python 3.9，导致无法创建新站点。

## 🔍 技术分析
- Heroku 在 2024 年停止支持 Python 3.9
- 需要升级到 Python 3.10+ 和 oTree 5.0+
- 使用 `.python-version` 替代 `runtime.txt`

## 💡 建议方案

### 步骤 1: 创建 .python-version 文件
```
3.11.0
```

### 步骤 2: 更新 oTree
```bash
pip install -U otree
otree upgrade
```

### 步骤 3: 更新 requirements.txt
```
otree>=5.0.0
Django>=4.2
```

### 步骤 4: 部署测试
```bash
git add .
git commit -m "chore: upgrade to Python 3.11 and oTree 5"
git push heroku main
```

## 📊 评估
- 技术难度：⭐⭐
- 商业价值：💰💰💰（很多用户面临此问题）
- Blog 价值：📝📝📝📝
- 紧急程度：🔥🔥🔥

## ✅ 下一步
- [x] AI 分析完成
- [ ] Rowan 确认
- [ ] 创建 Blog 文章
- [ ] Forum 回复
```

---

## Issue 3: [oTree Forum #1445] live_method 在 oTree Studio 不工作

**Labels**: `otree-forum`, `bug`, `studio`

**Body**:
```markdown
## 📋 问题信息
- **标题**: live_method not working in oTree Studio?
- **链接**: https://www.otreehub.com/forum/1445/
- **作者**: [待确认]
- **发布时间**: 2026-03-17

## 📝 问题描述
用户在 oTree Studio 中使用 live_method 时遇到问题，功能在 1 月更新后不工作了。

## 🔍 技术分析
- oTree 6.0 版本变更导致兼容性问题
- oTree 官方建议暂时使用 oTree 5
- CSS 文件分离导致的问题

## 💡 建议方案

### 临时方案
建议使用 oTree 5 直到官方修复

### 代码检查清单
```python
# models.py
class Subsession(BaseSubsession):
    def live_method(self, data, response):
        # 确保方法签名正确
        pass
```

```javascript
// pages/my_page.html
<script>
function myFunction() {
    live('my_method', {data: 'value'}, function(response) {
        // 处理响应
    });
}
</script>
```

## 📊 评估
- 技术难度：⭐⭐⭐
- 商业价值：💰💰（实时功能是高级需求）
- Blog 价值：📝📝📝
- 紧急程度：🔥🔥

## ✅ 下一步
- [x] AI 分析完成
- [ ] Rowan 确认
- [ ] 等待 oTree 官方修复或创建 workaround 教程
```

---

*创建时间：2026-03-18 16:50*
