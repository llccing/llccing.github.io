# oTree Forum 问题追踪

最后更新：2026-03-21 12:45

## 高优先级问题

### 1. ✅ 已完成 - Forum #1258: Unauthorized Users (安全问题)

**状态**: 
- 分析：✅ 完成
- Sample Project: ✅ 已完成
- Blog: ✅ 已完成（待发布）
- Forum 回复: ❌ 跳过（按用户要求）

**问题描述**: 未授权用户自动加入私有游戏会话

**解决方案**:
1. ✅ 增加 SESSION_CODE_LENGTH 到 12 位
2. ✅ 添加着陆页验证（Introduction 页面）
3. ✅ 参与者追踪（verification code）

**Sample Project**: `/root/.openclaw/workspace/otree-samples/secure-session-demo/`

**Blog 文件**: `xindama-blog/src/content/blog/otree-heroku-security-fix.md`

**下一步**: 
- [ ] 发布 Blog 到 xindama-blog（需要 The-Three-Fish 账号权限）

---

### 2. ✅ 已完成 - Forum #1437: Heroku Python 3.9 EOL

**状态**: 
- 分析：✅ 完成
- Sample Project: ✅ 已完成
- Blog: ✅ 已完成（待发布）
- Forum 回复: ❌ 跳过

**问题描述**: 旧 oTree Hub 站点卡在 Python 3.9，Heroku 已停止支持

**解决方案**:
1. ✅ 使用 `.python-version` 文件（推荐）
2. ✅ 手动编辑 `runtime.txt`
3. ✅ 完全迁移到新 oTree Hub

**Sample Project**: `/root/.openclaw/workspace/otree-samples/heroku-python-upgrade/`

**Blog 文件**: `xindama-blog/src/content/blog/otree-heroku-python-upgrade.md`

**下一步**: 
- [ ] 发布 Blog 到 xindama-blog

---

### 3. 🔄 分析中 - Forum #1445: live_method not working

**状态**: 等待抓取详情

**问题简述**: oTree Studio 中 live_method 在 1 月更新后不工作

---

## 新发现问题（2026-03-20 扫描）

| 编号 | 标题 | 优先级 | 状态 |
|------|------|--------|------|
| #1452 | How to update participant.payoff for MTurk | 🟡 中 | ⏳ 待分析 |
| #1449 | oTree updated, database must be deleted | 🟡 中 | ⏳ 待分析 |
| #1447 | Trouble access data during session | 🟡 中 | ⏳ 待分析 |

---

## 最新发现（2026-03-21 12:45 扫描）

| 编号 | 标题 | 优先级 | 状态 | Blog 价值 |
|------|------|--------|------|-----------|
| #1453 | oTree 6 Results WaitPage Problem | 🔴 高 | ⏳ 待分析 | 📝📝📝 |
| #1451 | Deleted apps by mistake | 🟡 中 | ⏳ 待分析 | - |
| #1450 | {{back_button}} conflicts with is_displayed | 🟡 中 | ✅ Chris 已回复 | - |
| #1448 | What happens to projects when cancel subscription? | 🟢 FAQ | ⏳ 待分析 | 📝📝 |
| #1446 | Change email address | 🟢 低 | - | - |
| #1444 | PLAYERS_PER_GROUP = 1 rather than None | 🟡 中 | ⏳ 待分析 | - |
| #1443 | oTree HR not recognize participant field (oTree 6.0) | ✅ 已解决 | Chris 已修复 | - |
| #1442 | How do sites deployment work concretely? | 🟢 中 | ⏳ 待分析 | 📝📝📝 |
| #1441 | oTree MTurk Sandbox shows blank iframe | 🔴 高 | ⏳ 待分析 | 📝📝 |
| #1440 | Participants in progress | ⏳ 待查看 | - | - |
| #1439 | liveSend to another group? | ⏳ 待查看 | - | - |
| #1438 | Project disappeared from oTree Studio after OTAI | 🟡 中 | ⏳ 待分析 | - |

---

## 🔥 高价值问题详情

### #1453 - oTree 6 Results WaitPage Problem（高优先级）
**链接**: https://www.otreehub.com/forum/1453/
**作者**: memo
**时间**: March 21, 2026（今天）

**问题描述**: 
用户使用 oTree 5 编写的应用，使用 `otree update_my_code` 升级到 oTree 6 后出现问题。所有应用在 v5 正常运行，升级到 v6 后失败。

**分析**: 
- 这是典型的版本迁移问题
- oTree 6 可能有 breaking changes
- **高 Blog 价值**: 可以写 "oTree 5 → 6 迁移指南"

**建议行动**:
- [ ] 请求用户分享代码
- [ ] 分析具体错误
- [ ] 创建迁移指南 Blog

---

### #1441 - oTree MTurk Sandbox blank iframe（高优先级）
**链接**: https://www.otreehub.com/forum/1441/
**问题**: MTurk Sandbox 中 iframe 内容完全空白，Network 标签看不到任何请求到达 oTree/Heroku 域名

**分析**:
- 这是 blocking issue，用户无法进行 MTurk 测试
- 可能是 CORS、X-Frame-Options 或模板配置问题
- 提供的 mturk_template.html 看起来基本正确

**建议行动**:
- [ ] 需要更多错误信息（浏览器控制台）
- [ ] 检查 Heroku 部署配置
- [ ] 创建 MTurk 集成排查指南

---

### #1448 - Subscription Cancellation（Blog 价值）
**链接**: https://www.otreehub.com/forum/1448/
**问题**: 用户想暂时取消订阅，询问项目和数据的命运

**分析**:
- 常见 FAQ 问题
- 适合创建 "oTree 订阅管理指南" Blog

**建议行动**:
- [ ] 确认官方政策
- [ ] 创建 FAQ 风格 Blog 文章

---

### #1442 - Sites Deployment（Blog 价值）
**链接**: https://www.otreehub.com/forum/1442/
**问题**: 用户询问站点部署的具体工作流程

**分析**:
- 新手常见问题
- 适合创建 "oTree 部署完整指南" Blog

**建议行动**:
- [ ] 创建详细部署教程（Heroku + oTree Hub）

---

## 工作流程

1. ✅ AI 扫描论坛前 20 个帖子
2. ✅ 更新此追踪文档
3. ✅ Rowan 确认优先级（分析问题 → Sample → Blog，不回复 Forum）
4. ✅ AI 分析并提供详细解决方案
5. ✅ 创建 Sample Project
6. ✅ 创建 Blog 文章
7. ❌ Forum 回复（已跳过）
8. ⏳ 发布 Blog（等权限）

---

## 产出汇总

### Sample Projects
- `/root/.openclaw/workspace/otree-samples/secure-session-demo/` - 安全会话配置
- `/root/.openclaw/workspace/otree-samples/heroku-python-upgrade/` - Python 升级指南

### Blog 文章
- `otree-heroku-security-fix.md` - 212 行，安全修复教程
- `otree-heroku-python-upgrade.md` - 5082 字节，Python 升级教程

### 待发布
两篇 Blog 文章已准备好，需要 The-Three-Fish 账号权限推送到 xindama-blog 仓库。
