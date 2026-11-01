# 项目页展示策略分析 · /projects/

> 对应任务：【WorkBuddy】分析个人网站项目展示策略
> 分析对象：`rowanliu.com/projects/`（本仓库 `src/pages/projects/` + `src/data/projects.ts`）
> 状态：**结论已全部落地并通过构建验证**（2026-11-01），文档保留完整推理过程供回溯。

---

## 结论先行

**问题不在文案，在定位断层。** `/portfolio/` 简历页公开写了国泰航空（Angular + Node BFF）、京东 IDC（Vue 0→1，80+ 页面 / 10 万行）、iCluster（Angular + Spring Boot）这些有量化成果的企业级系统，而 `/projects/` 原先全部是 Bun / Next.js / tRPC / React Native / oTree 这类与主栈无关的业余实验。**一个只有业余项目的作品页，会反过来削弱专业可信度。**

最终采用的结构（经确认）：**保留 `/projects/`，改为三段式**——

1. **Enterprise systems**（4 条，来自过往雇主，明确排除在职的埃森哲/国泰）
2. **Personal work**（仅 Rowan's Blog，升为唯一个人作品）
3. **Archive**（折叠区块，5 个已停止的实验，详情页带归档横幅）

---

## 1. 取舍判断标准：四道闸

每个项目必须连过四关，任一关不过就降级或归档。判据要求**可复述**——不能用一句话向面试官讲明白，就是没过。

| 闸口 | 判据 | 不过的处置 |
|---|---|---|
| **A. 能力信号** | 体现目标岗位栈（Angular / TypeScript / Node·NestJS / 企业级全栈）或强可迁移能力（类型安全契约、API 聚合、生产排障） | 降级 |
| **B. 可讲述成果** | 能不铺垫地说清：做了什么 → 我做了什么决策 → 结果变了什么。必须有数字或可验证产物 | 降级或归档 |
| **C. 方向一致** | 服务于 `Angular + Node` 全栈定位，或简历已列的「AI 辅助交付」 | 归档 |
| **D. 维护风险** | 现在点进去是否还立得住？是否已自认停止、链接是否可能腐坏 | 归档 |

**用户自有的第五条标准**（比四道闸更有决定性）：「我自己也说不清楚做了什么、有什么价值」。一个你自己都不愿在面试里主动展开的项目，留在页面上就是负债——它会被追问，而你答不好。

**结构性根因**：`[slug].astro` 模板原先强制所有项目走「01 概述 / 02 问题 / 03 构建 / 04 现状」四幕案例结构。周末实验被迫套上案例研究的壳，只能编造「问题」和「构建」——空洞文案来源于模板，不只来源于写作。所以本次同时修了模板语义：归档项目第四节改为 **04 / Where it ended — Why it stopped**（诚实收尾），不再伪装成活产品。

## 2. 逐项结论

| 项目 | A | B | C | D | 结论 | 现状 |
|---|:--:|:--:|:--:|:--:|---|---|
| **Magic Literacy Garden** | ✅ Vue+TS 命中主栈 | ❌ 自认 demo、没做多久、私有源码访客进不去 | ⚠️ 产品思维沾边 | ✅ 在用但不想讲 | **归档**（用户判断 + 我的加强理由：讲不清价值的项目是负债） | 归档折叠区 |
| **Rowan's Blog** | ✅ Astro/TS/Cloudflare | ✅ 长期维护、173 篇文章、digest/标注/搜索系统可量化 | ✅ 技术写作 + 工程持续投入 | ✅ 长期维护 | **保留 · 升为唯一个人作品** | Personal work 唯一条目 |
| **Fashion AI Workbench** | ⚠️ 仅 tRPC 契约可迁移 | ❌ 无用户无数字，自述 "development is parked" | ⚠️ 仅「AI 辅助」沾边 | ❌ 已停 | **归档** | 归档折叠区 |
| **LinguaLeap** | ❌ | ❌ 自认「已被取代」 | ❌ 与识字花园重复 | ❌ 已停 | **归档** | 归档折叠区 |
| **Mobile AI Learning** | ❌ React Native 非主栈 | ❌ 无产物可验证 | ❌ | ❌ 已停 | **归档** | 归档折叠区 |
| **oTree Tools Archive** | ❌ Python/oTree 非主栈 | ❌ 商业方向已关停 | ❌ | ❌ 已停 | **归档** | 归档折叠区 |
| 企业系统 ×4（iCluster / 动态表单+ABP / 京东 IDC / 滴滴） | ✅ 全部命中主栈 | ✅ 全部有量化成果 | ✅ | ✅（过往雇主，无在职披露风险） | **保留并新建「Enterprise systems」区块** | 新增 `selectedWork.ts` |

**关于排除埃森哲/国泰航空**：`/portfolio/` 已公开写了国泰的全部细节，从 `/projects/` 拿掉它不降低任何曝光度。站得住的理由是：① 还在职没必要重复展示；② 客户项目不宜做深度案例拆解。

**关于「只剩 blog 要不要删掉 Projects 分类」**：曾评估过整体删除并把导航换成 Portfolio，最终确认**保留 `/projects/` 三段式**。理由：删除方案会丢「招聘方习惯找 Projects 入口」的惯性，而三段式以极低成本同时覆盖了企业系统、个人作品与诚实归档三个叙事面。

## 3. 归档方式（已实现）

| 手段 | 实现 |
|---|---|
| 归档不消失，但降权 | 首页 `<details>` 折叠区块「Archive · 05 · no longer developed」，默认收起，不占首屏 |
| 详情页诚实收尾 | 归档项目 hero 带 `Archived — this project is no longer developed. It stays here as an engineering record, not as something you can rely on.` 横幅 |
| 结构语义切换 | 第四节标题按状态切换：active → 「04 / Current state — What remains」；archived → 「04 / Where it ended — Why it stopped」 |
| 不造新页面 | 5 个 repo 均在 GitHub 公开，不单独建「归档页」；站点只保留案例记录 |
| 旧 URL 零损失 | 保留了 `/projects/[slug]/` 路由，6 个已收录 URL 全部继续有效，无需 `_redirects` |

## 4. 保留项展示文案要点

**Enterprise systems 四条**（已落地于 `src/data/selectedWork.ts`，文案结构 = 一句 summary + 一句 impact）：

- **iCluster Web** — Angular + Tailwind + Spring Boot 全链路交付（Figma 原型到发布）；亮点：Angular 13→15 升级主导、Keycloak + JHipster 封装成可复用认证接入。
- **动态表单 + ABP 组件库** — NG-ZORRO/RxJS/NestJS/TypeORM 动态表单 + 阿斯利康诊所小程序；亮点：**技术领导力**（工作量评估、任务分配、Code Review、带新人）。
- **京东 IDC 基础设施平台** — Vue 从 0 到 1，80+ 页面 / 10 万行；亮点：idc-cli 脚手架与页面级埋点、工单模块解耦支持多人并行。
- **滴滴司机端** — 活动 H5 + MPX 小程序；亮点：**99% 设计还原度**、Vue CLI 插件升级。

**Rowan's Blog 文案要点**（如需再润色，按此收紧）：

- 目的：不是「博客」，是**持续维护的发布系统**——公开笔记本 + 自动化 digest 管线 + 同源标注 API。
- 角色：唯一作者与维护者，从内容到 Cloudflare Workers/D1/Durable Objects 基础设施。
- 可量化：**173 篇文章、多年连续发布、digest 自动化管线、全文搜索、阅读标注系统**（建议把「48 篇 Angular 文章」等更精确的口径补上，数字比形容词有力）。
- 一句话定位（现文案已达标）：*"The site remains the primary public entry point for writing and shipped work."*

## 5. 分步方案与执行状态

| 步骤 | 动作 | 状态 |
|---|---|---|
| P0 | `projects.ts` 瘦身：仅 blog `active/featured`，其余 5 个 `archived` | ✅ 已完成 |
| P1 | 新建 `src/data/selectedWork.ts`（4 条企业系统，排除在职雇主，文件头注释写明原因） | ✅ 已完成 |
| P2 | 重写 `projects/index.astro` 为三段结构（Enterprise / Personal / Archive 折叠） | ✅ 已完成 |
| P3 | `[slug].astro` 归档横幅 + 「Where it ended」语义切换 | ✅ 已完成 |
| P4 | 接入「纸 × 朱批」设计令牌（line/muted/measure/gutter），清除 5 套项目各异的 accent 色（cyan/green/red/yellow/blue → 唯一朱砂强调色），`status-active` 同步改用令牌 | ✅ 本次完成 |
| P5 | `astro check` 0 错误 + `pnpm build` 通过 + 截图核验 | ✅ 已通过 |

### 待用户拍板的两个后续项（未动，避免扩大改动面）

1. **`/portfolio/` 不在导航里**。全站导航为 Posts/Projects/Digest/Tags/Radio/About/Search，最完整的简历页只能从 `/about/` 和 projects 页尾链进入。建议在导航加「Portfolio」项（或把标签写成覆盖面更广的「Work」）。
2. **blog 案例文案的数字口径**：`outcome` 里 "This projects section is the next step..." 一句已过时（三段式已上线），建议顺手改成指向归档区块的诚实收尾。

---

## 验证记录

- `astro check`：103 files，0 errors / 0 warnings / 0 hints。
- `pnpm build`：Complete，545 页。
- 无头浏览器截图核验：`/projects/`（三段结构、Enterprise 04 条、Archive 折叠、导航高亮正确）；`/projects/lingualeap/`（浅色纸白、朱砂标题、归档横幅、01–04 编号、侧栏 Project record）。
