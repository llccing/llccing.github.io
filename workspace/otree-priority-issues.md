# oTree Forum 高优先级问题分析

## 问题 1: Unauthorized Users Automatically Joining Private Game Sessions 🔴

**链接**: https://www.otreehub.com/forum/1258/  
**作者**: chonghaopeng  
**时间**: 2026-03-15  
**回复数**: 5

### 问题描述
用户在 Heroku 平台上部署的 oTree 游戏会话被未授权用户自动加入，这是一个严重的安全问题。

### 技术分析
可能的原因：
1. **会话 URL 可预测** - 如果 session code 生成不够随机
2. **缺少访问控制** - 没有验证参与者身份
3. **Heroku 配置问题** - 环境变量或 session 设置不当
4. **oTree 版本 bug** - 某些版本存在安全漏洞

### 建议解决方案

#### 方案 A: 增强 Session Code 安全性
```python
# settings.py
SESSION_CODE_LENGTH = 12  # 增加到 12 位
SESSION_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
```

#### 方案 B: 添加访问密码
```python
# settings.py
AUTHENTICATE = True

# 或者自定义
def before_participant_arrives(request):
    if not request.session.get('authenticated'):
        return redirect('auth_page')
```

#### 方案 C: 使用 Whitelist
```python
# 限制特定 IP 或用户
ALLOWED_HOSTS = ['your-app.herokuapp.com']
```

### Blog 价值
⭐⭐⭐⭐⭐ 安全问题，所有 oTree 开发者都关心

### 预计工作量
- 分析：2 小时
- 解决：1-2 小时
- Blog: 2 小时

---

## 问题 2: Old oTree Hub site stuck on Python 3.9 (Heroku EOL) 🔴

**链接**: https://www.otreehub.com/forum/1437/  
**作者**: [待确认]  
**时间**: 2026-03-16  
**回复数**: [待确认]

### 问题描述
用户的旧 oTree Hub 站点卡在 Python 3.9，但 Heroku 已经停止支持 Python 3.9，导致无法创建新站点。

### 技术分析
- Heroku 在 2024 年停止支持 Python 3.9
- oTree Hub 可能使用旧的 buildpack
- 需要升级到 Python 3.10+ 和 oTree 5.0+

### 建议解决方案

#### 步骤 1: 检查当前配置
```bash
# runtime.txt
python-3.11.0

# requirements.txt
otree>=5.0.0
```

#### 步骤 2: 更新 Heroku Buildpack
```bash
heroku buildpacks:set heroku/python
```

#### 步骤 3: 迁移到 oTree 5
```bash
pip install -U otree
otree upgrade
```

#### 步骤 4: 修复兼容性问题
- 更新 Django 到 4.2+
- 检查废弃的 API
- 测试所有页面

### Blog 价值
⭐⭐⭐⭐ 很多用户面临 Heroku EOL 问题

### 预计工作量
- 分析：1 小时
- 解决：2-3 小时
- Blog: 2 小时

---

## 问题 3: live_method not working in oTree Studio? 🟡

**链接**: https://www.otreehub.com/forum/1445/  
**作者**: [待确认]  
**时间**: 2026-03-17  
**回复数**: [待确认]

### 问题描述
用户在 oTree Studio 中使用 `live_method` 时遇到问题，功能不工作。

### 技术分析
`live_method` 用于实时通信（如聊天、多人游戏），常见问题：
1. **WebSocket 配置** - Studio 可能不支持
2. **JavaScript 错误** - 前端代码问题
3. **版本兼容性** - oTree 6.0 有变化
4. **浏览器兼容性**

### 建议解决方案

#### 检查清单
```python
# models.py
class Subsession(BaseSubsession):
    def live_method(self, data, response):
        # 确保方法签名正确
        pass
```

#### 前端调用
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

#### 调试步骤
1. 检查浏览器控制台错误
2. 查看服务器日志
3. 测试本地环境
4. 验证 oTree 版本

### Blog 价值
⭐⭐⭐ 实时功能是高级需求

### 预计工作量
- 分析：1 小时
- 解决：1-2 小时
- Blog: 1.5 小时

---

## 下一步行动

1. **创建 GitHub Issues** - 需要 Rowan 创建（权限问题）
2. **深入分析第一个问题** - 获取完整问题内容
3. **提供详细解决方案** - 包含代码示例
4. **准备 Blog 草稿** - 在 the-three-fish.github.io
5. **Forum 回复** - 使用保存的账号

---

*最后更新：2026-03-18 16:45*
