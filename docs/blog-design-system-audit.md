# Blog 设计规范现状评估与改造方案

> 评估对象：`llccing.github.io`（Astro 4 + AstroPaper 定制版 + Tailwind 3）
> 评估范围：blog 相关的 layout / component / page / style / content schema
> 评估时间：2026-10-31
> 所有结论均来自实际代码与构建产物，附 `文件:行号` 证据

---

## 0. 结论先行

1. **这不是"风格不好看"的问题，是"Design System 只有最上面一层"的问题。**
   页面模板层可用，但支撑它的**令牌层、基础组件层、组合模式层基本是空的**。目前站点靠"手写 CSS + Tailwind 工具类 + 复制粘贴"维持视觉一致性，改一处要改 N 处。

2. **有一个会持续埋雷的隐蔽缺陷：`md:` / `lg:` / `xl:` 断点全部失效。**
   `tailwind.config.cjs:17-19` 把 `screens` 写在 `theme` 根级（不是 `extend`），只保留了 `sm: 640px`，默认断点被整体替换。构建产物里只有 `640px` 和 `980px` 两个媒体查询（`dist/_astro/*.css` 实测）。现在 `lg:` 等 8 处用法全在 portfolio 页面，blog 暂时没踩到 —— 但任何人在 blog 写一个 `lg:grid-cols-2` 都会**静默失效**。

3. **中文阅读体验是最大的体验债。** `base.css:32` 给 `body` 上了 `font-mono`（IBM Plex Mono），该字体**不含 CJK 字形**，180 篇中文文章的正文实际由系统默认等宽字体回退渲染，中英混排基线不齐、中文在等宽度量下笔画被压缩。同时为了这 6 个字重的字体付了 Google Fonts 阻塞请求，对中文零收益 —— **纯负收益**。

4. **版心有三套并存**：`base.css:37` 全局 `max-w-3xl`(48rem)、`PostDetails.astro:202` 文章 `max-w-3xl`、`Posts.astro:184` 与 `index.astro:114` 列表/首页 `max-width: 72rem`。从归档页点进文章，版心从 1152px 骤缩到 768px，视觉断裂。

5. **可访问性有 2 处硬伤会直接违规**：归档页标签下拉框 `outline-none` 且无替代焦点样式（`Posts.astro:281-285`，键盘用户完全看不到焦点）；用 `opacity-50/60` 表达弱化文本，实测对比度分别约 **3.1:1 / 4.1:1**，低于 WCAG AA 的 4.5:1。

**建议路径**：先做方案 A（约 2 人日止血），再滚动到方案 B（约 6 人日分层组件化）。方案 C 不建议现在启动。

---

## 1. 现状评估

优先级定义：**P0** = 影响所有页面或埋持续隐患，必须近期修；**P1** = 影响体验一致性，本季度修；**P2** = 优化项，可排后。

### 1.1 信息架构（IA）

| # | 问题 | 证据 | 影响 | 优先级 |
|---|---|---|---|---|
| IA-1 | **分类靠文件路径推断，schema 里没有 category 字段**。`getDirectoryKey` 用 `id.split("/")` 猜分类（`Posts.astro:40-42`），`src/content/blog/` 下同时有 6 个子目录（backend/cert/english/frontend/life/other）和根目录散落的 md。移动一个文件 = 分类静默改变 | `Posts.astro:40-42`、`content/config.ts:4-25` | 高 | **P1** |
| IA-2 | **导航 7 项里 blog 只占 1 项，且混入无关入口**。Posts / Projects / Digest / Tags / Radio / About / Search 平铺，Radio 与写作主线无关；Search 只服务 blog 却与 Radio 同级 | `Header.astro:66-97` | 中 | P2 |
| IA-3 | **heading 层级扁平化**。归档页 h1「Posts」→ h2「Full archive」→ 文章标题默认也是 h2（`Card.tsx:50-54`，`Posts.astro:138` 未传 `secHeading` 默认 `true`），区块标题与内容标题同级，屏幕阅读器无法建立从属关系 | `Posts.astro:138`、`Card.tsx:51` | 中 | **P1** |
| IA-4 | **Breadcrumbs 存在死逻辑**。针对 `tags/[tag]/[page]` 做了页码改写，但 `src/pages/tags` 下只有 `index.astro` 与 `[tag]/`，分页路由已不存在 | `Breadcrumbs.astro:9-24` | 低 | P2 |
| IA-5 | **四个内容集合语义边界模糊**：blog(180) / short-stories(10) / digest(85) / originals。digest 是机器生成、short-stories 是虚构，却在 tags 页聚合在一起，搜索只覆盖 blog | `content/config.ts:95-100` | 中 | P2 |

### 1.2 视觉一致性

| # | 问题 | 证据 | 影响 | 优先级 |
|---|---|---|---|---|
| VC-1 | **令牌层只有 6 个颜色变量，尺度令牌为零**。没有 spacing / fontSize / radius / shadow / z-index 令牌，间距全靠 30+ 种 Tailwind 数字类（`gap-2`×28、`px-4`×18、`mt-8`×14…），圆角在 `rounded` / `rounded-md` / `rounded-lg` / `rounded-full` 间随机 | `base.css:6-22` | 高 | **P0** |
| VC-2 | **弱化文本用 `opacity-*` 而非语义色**。共 45 处（`opacity-70`×13、`opacity-60`×7、`opacity-50`×5、`opacity-30`×2…），透明度叠在文本色上，实际渲染色随主题漂移，无法做对比度保证 | `Card.tsx:43,55`、`Posts.astro:264` | 高 | **P0** |
| VC-3 | **暗色主题是"另一套配色"，不是同一语义的暗色映射**。light 的 `--color-card-muted` 是中性灰 `#cdcdcd`，dark 是橙色 `#8a3302`；`--color-border` light `#ece9e9` vs dark `#ab4b08`；accent 从蓝 `#006cac` 跳到橙 `#ff6b01`。语义在切换主题后断裂 | `base.css:6-22` | 中 | **P1** |
| VC-4 | **版心三套并存**（48rem / 48rem / 72rem），且全局 `section, footer` 的 48rem 被页面 scoped CSS 覆盖，两套系统互相打架 | `base.css:37`、`PostDetails.astro:202`、`Posts.astro:184` | 高 | **P0** |
| VC-5 | **首页与归档页复制了约 90 行相同样式**（`.eyebrow` / `.intro-grid` / `.section-heading` / `.post-list` / `--editorial-line` / `--editorial-muted`），且局部变量各定义一遍，`.writing-section` 与 `.archive-section` 是同一模式的两个名字 | `index.astro:104-257` vs `Posts.astro:168-317` | 高 | **P1** |
| VC-6 | **字号无阶梯**。`text-xs`×35、`text-sm`×49 占了绝大多数，`text-5xl` 直接跳到 `text-3xl`（首页 h1 用 `clamp(2.5rem,6.5vw,4.75rem)` 手写，归档页 h1 用 `clamp(2.75rem,7vw,5.5rem)`），两个 h1 用了两套 clamp 参数 | `index.astro:143`、`Posts.astro:212` | 中 | **P1** |
| VC-7 | **日期格式不一致**：Card 用 `day:"2-digit"`，Datetime 用 `day:"numeric"`；`uppercase` 应用在中文标签上无效、应用在英文标签上改变语义 | `Card.tsx:21-27`、`Datetime.tsx:61-65` | 低 | P2 |

### 1.3 响应式与可访问性

| # | 问题 | 证据 | 影响 | 优先级 |
|---|---|---|---|---|
| RA-1 | **断点体系被截断**：`theme.screens` 只声明 `sm`，`md/lg/xl/2xl` 工具类不生成 CSS。构建产物实测仅 `@media (min-width: 640px)` ×18、`980px` ×1 | `tailwind.config.cjs:17-19`、`dist/_astro/*.css` | **极高** | **P0** |
| RA-2 | **响应式策略靠手写 `@media` 补位**：7 处手写断点散落在 6 个文件，与 Tailwind 断点体系并行，维护双轨 | `base.css:99`、`PostDetails.astro:225`、`Posts.astro:308` 等 | 高 | **P0** |
| RA-3 | **标签下拉框焦点完全不可见**：`outline-none` 且只有 `hover:` 样式，无任何 `focus-visible` 替代 | `Posts.astro:281-285` | 高 | **P0** |
| RA-4 | **交互按钮缺焦点样式**：`.dir-pill` / `.toggle-btn` / `.clear-btn` / `.copy-code` 均未加 `.focus-outline`（该工具类只用在 skip-link、hamburger、theme-btn、back-to-top） | `Posts.astro:271-298`、`PostDetails.astro:302` | 高 | **P0** |
| RA-5 | **对比度不达 AA**：`opacity-50` 用于 12px `.filter-label` ≈ **3.1:1**，`opacity-60` 用于 14px 描述 ≈ **4.1:1**（light 主题，实测混合值），均低于 4.5:1 | `Posts.astro:264`、`Card.tsx:43` | 高 | **P0** |
| RA-6 | **中英混排未标 `lang`**：`<html lang="zh-CN">` 下存在大量英文 UI 文案（"Go back" / "Back to Top" / "Browse the full archive" / "Skip to content" / "Full archive"），屏幕阅读器会用中文语音朗读英文 | `PostDetails.astro:83,189`、`Posts.astro:91` | 中 | **P1** |
| RA-7 | **触摸目标偏小**：`.dir-pill` 为 `px-3 py-0.5`，实测高度约 24px，低于 44px 建议值 | `Posts.astro:271-273` | 中 | **P1** |
| RA-8 | **`#main-content` 无 `tabindex="-1"`**，skip link 跳转后焦点在非 WebKit 浏览器不转移 | `PostDetails.astro:86`、`Posts.astro:68` | 中 | **P1** |
| RA-9 | **主题按钮 `aria-label="auto"` 固定不变**，切换后无障碍名称不更新，`aria-live="polite"` 容器内无可播报文本 | `Header.astro:120-126` | 低 | P2 |
| RA-10 | **动态生成元素无键盘可达性**：`addHeadingLinks()` 生成的 `#` 锚点链接设了 `ariaHidden`，`pre` 加 `tabindex="0"` 但复制按钮是 `<button>` 嵌在 `pre` 内（HTML 语义上 `pre` 内不应有交互元素） | `PostDetails.astro:277-315` | 中 | **P1** |

### 1.4 内容结构与阅读体验

| # | 问题 | 证据 | 影响 | 优先级 |
|---|---|---|---|---|
| CX-1 | **正文使用等宽字体**：`body { font-mono }`，IBM Plex Mono 无 CJK 字形，中文回退到系统等宽字体。等宽字体的中文在 14–16px 下笔画拥挤、行内节奏差，长文阅读疲劳显著 | `base.css:32`、`tailwind.config.cjs:57-59` | **极高** | **P0** |
| CX-2 | **行宽与行高未针对中文调优**：`.prose` 未覆盖 `prose-p:leading` / `max-width`，沿用 typography 插件默认 65ch —— 对中文约等于 65 个汉字，实际偏窄；中文正文推荐 32–42 字/行 | `base.css:51-71` | 高 | **P0** |
| CX-3 | **中英混排无标点/间距处理**：未引入 `text-autospace` 或 CJK 排版增强，中英文之间、中文与数字之间无自动间隙 | — | 中 | P2 |
| CX-4 | **目录（TOC）实现粗糙**：用 `<details>` + 内联 `style="margin-left: Nrem"` 手搓缩进，无当前章节高亮（scroll-spy），且 `open` 默认展开会挤压正文首屏 | `PostDetails.astro:123-134`、`145-156` | 中 | **P1** |
| CX-5 | **无内容组件（语义块）**：正文里没有 callout / note / warning / 术语解释等语义容器，所有强调只能靠引用与加粗，长文的信息层次靠标题硬撑 | `.prose` 仅覆盖基础元素 | 中 | **P1** |
| CX-6 | **归档页 180 篇一次性渲染**：`posts/index.astro:18` 传 `allPosts`，产物 `dist/posts/index.html` **210KB / 196 个 `<li>`**，靠客户端 JS 过滤；`SITE.postPerPage: 10` 实际未生效 | `posts/index.astro:18`、`config.ts:11` | 高 | **P1** |
| CX-7 | **详情页元信息层级弱**：标题 `text-2xl`、日期 `opacity-80`，"Updated:" 与"Published:" 视觉无差异，无阅读时长与标签的视觉分组 | `PostDetails.astro:87-94` | 低 | P2 |

### 1.5 性能与后续可维护性

| # | 问题 | 证据 | 影响 | 优先级 |
|---|---|---|---|---|
| PF-1 | **Google Fonts 阻塞渲染且对中文零收益**：6 个字重（0,400/500/600/700 + 1,400/600）的 IBM Plex Mono，仅 `preconnect` + 同步 `stylesheet`，CJK 全部回退 | `Layout.astro:88-93` | 高 | **P0** |
| PF-2 | **归档页 HTML 210KB**（见 CX-6），首屏 DOM 节点多，客户端过滤脚本需遍历 180 项 | `dist/posts/index.html` | 中 | **P1** |
| PF-3 | **React 用于无交互组件**：`Card.tsx` 无状态无事件，却被写成 `.tsx`，与项目约定「只在交互处用 React island」相悖（`AGENTS.md`）；同一模式若扩散，会持续引入不必要的运行时 | `Card.tsx` | 中 | **P1** |
| PF-4 | **样式三套系统并行**：Tailwind 工具类（82 处 `sm:`）+ Astro scoped CSS（手写 rem/clamp）+ `base.css` 全局 `@layer base`。改一个视觉属性要判断它属于哪一套 | 全局 | 高 | **P1** |
| PF-5 | **文章页每篇加载 2 个 React island**：`Comments client:only` + `InlineComments client:only`，且 `ViewTransitions` 全站启用 | `PostDetails.astro:168,195` | 中 | P2 |
| PF-6 | **`<meta name="theme-color" content="">` 空值**，浏览器无法着色 UI | `Layout.astro:95` | 低 | P2 |
| PF-7 | **无组件文档 / 视觉回归 / Storybook**，Design System 只能靠读源码理解；`portfolio` 组件已有 40+ 处硬编码 hex（`#202124`、`#f6f3ec`…），是"不收敛会怎样"的现成反例 | `portfolio/PortfolioExperience.tsx` | 中 | **P1** |

**值得肯定的部分（不要动）**：Tailwind 按需 + jampack 让首页 CSS 仅 5.9KB + 4.8KB；已具备 skip-link、focus-outline 工具类、`aria-current`、`<time datetime>`、OG/Twitter 卡片、RSS、sitemap；`Asia/Shanghai` 时区已统一。这些是好的地基，改造应保留。

---

## 2. 候选方案

### 方案 A：令牌先行（最小侵入止血）

- **适用场景**：想先建立"单一事实来源"，不改动任何页面结构和视觉风格；近期有多人并行改样式、需要防止继续分叉
- **工作量**：约 **1.5–2 人日**
- **保留**：全部页面结构、组件 API、路由、视觉呈现（对外观几乎零变化）
- **重构范围**：
  - `src/styles/tokens.css` 新建：补齐 spacing（4px 基准 8 档）、fontSize（含中文行高对）、radius、shadow、z-index、motion 令牌
  - 语义色扩展：`--color-text-muted` / `--color-text-subtle` / `--color-surface` / `--color-surface-raised`，替换 45 处 `opacity-*`
  - `tailwind.config.cjs`：恢复 4 档断点（或显式声明只有 sm 并加 lint 禁止 md/lg/xl），把令牌映射进 `theme.extend`
  - 版心令牌：`--container-prose`（约 44rem）/ `--container-archive`（72rem）/ `--container-wide`，替换散落的 `max-w-3xl` 与 `72rem`
  - 字体令牌：`--font-sans`（中文优先栈）、`--font-mono`（仅代码），`body` 从 `font-mono` 切到 `font-sans`
- **与 Design System 的衔接**：产出第一层（Tokens）。所有后续组件强制引用令牌，禁止裸 Tailwind 数字类表达语义。这是 B 的 P0 子集，**做完 A 再做 B 不返工**

### 方案 B：分层组件化（推荐）

- **适用场景**：blog 要长期演进，且希望同一套 DS 复用到 projects / digest / portfolio（后者目前是硬编码 hex 重灾区）
- **工作量**：约 **5–8 人日**，分 P0–P3 滚动
- **保留**：`Layout` / `PostDetails` / `Posts` 三个模板骨架、四个内容集合、全部路由、现有视觉调性
- **重构范围**（含 A 的全部）：
  - **Primitives**：`Card.tsx` → `Card.astro`（去掉无谓的 React）；补充 `Button` / `Pill` / `Select` / `Tag` / `MetaRow`（日期+阅读时长+标签的统一元信息行）/ `Prose`
  - **Patterns**：`IntroBlock`（含 eyebrow + 大标题 + 导语）、`SectionHeader`（标题 + 计数）、`PostList`（含过滤状态的空态与计数）、`FilterBar` —— 消除首页与归档页的 90 行重复
  - **Templates**：统一三套版心的容器组件，`PostDetails` 的 TOC 抽出为 `TableOfContents.astro`（含 scroll-spy 与 heading 层级修正）
  - **内容组件**：为正文引入 `Callout` / `Note` / `Aside` 语义块（可通过 remark 指令或 MDX 组件实现）
  - **归档页分页**：恢复 `SITE.postPerPage` 生效（或改为按年份分组 + 折叠），把 210KB 降下来
- **与 Design System 的衔接**：形成 Tokens → Primitives → Patterns → Templates 四层目录（`src/ds/`），每个组件带 `README.md`（用法 + 变体 + 无障碍要求），并配一份 `docs/design-system.md` 作为唯一入口

### 方案 C：视觉体系重做

- **适用场景**：对现有 editorial/mono 调性不满意，想重新定位品牌视觉（例如更工程感 / 更杂志感）
- **工作量**：约 **12–15 人日**
- **保留**：内容与路由、B 产出的 DS 分层架构
- **重构范围**：中文排版系统重写（字体栈、字号阶梯、行高、行宽、标点挤压）、色彩语义重定义、暗色主题按语义重映射（而非换一套色）、卡片与列表视觉语言、动效规范
- **与 Design System 的衔接**：**B 是 C 的必要前置**。没有 B 的分层，C 的视觉改动仍会散落在各页面，无法收敛

### 方案对比

| 维度 | A 令牌先行 | B 分层组件化 | C 视觉重做 |
|---|---|---|---|
| 适用场景 | 快速止血、多人协作防分叉 | 长期演进、跨站复用 | 品牌视觉重新定位 |
| 工作量 | 1.5–2 人日 | 5–8 人日 | 12–15 人日 |
| 视觉变化 | 几乎无（仅字体与对比度改善） | 小（结构一致化带来轻微变化） | 大 |
| 线上风险 | 低 | 中 | 高 |
| 内容/路由改动 | 无 | 无 | 无 |
| 解决 P0 数量 | 6 / 8 | 8 / 8 | 8 / 8 |
| DS 就绪度 | 第 1 层 | 第 1–4 层 + 文档 | 在 B 之上换皮 |
| 返工风险 | 无（B 的子集） | 无（C 的前置） | 若跳过 B 则高 |

**取舍依据**：A 与 B 不是二选一，而是**同一条路的两个阶段**。C 现在不做，理由是「中文排版 + 令牌 + 断点 + 焦点」这四项基础设施缺陷不解决，任何视觉重做都会建在沙地上；且你偏好反对 scope creep，一次性动视觉会牵连 180 篇文章的呈现。

**推荐路径**：`A（1–2 人日，本周）→ B（分 3 个 PR，2–3 周）→ C（观望，或仅做中文排版专项）`

---

## 3. 参考案例

| 站点 | 类型 | 可借鉴的具体设计点 |
|---|---|---|
| **danluu.com**（Dan Luu） | 极简技术写作 | ① **排版节奏**：正文行宽约 75 字符、行高 1.5、仅用一条横线分节，几乎零装饰，把注意力全部留给内容 —— 可直接抄它的"分隔线 + 稀疏强调"策略来替代当前靠 opacity 弱化文本的做法<br>② **系统字体栈**：完全不加载 Web Font，首屏零字体请求 —— 对应我们 PF-1 的终极解法<br>③ 列表页只有"标题 + 日期"，无描述无标签，密度极高 —— 可对照反思我们 Card 里 `tags[0] ?? "Note"` 是否必要 |
| **jvns.ca**（Julia Evans） | 内容组件化 | ① **语义化内容块**：把 note / aside / warning / 问答做成有配色的语义容器，长文信息层次不靠标题硬撑 —— 直接对应我们 CX-5 的缺失<br>② **单一强调色 + 大量留白**：整站只用 1 个强调色，其余全靠中性色阶与留白区分层级 —— 可解决我们 VC-2 用透明度做层级的习惯<br>③ 手绘插图充当组件变体标识，成本低、辨识度高 |
| **antfu.me**（Anthony Fu） | Astro/Vue 生态 | ① **主题切换架构**：CSS 变量 + `.dark` class + 无闪烁内联脚本，明暗是同一语义的两套映射而非两套配色 —— 直接对照我们 VC-3 的断层问题<br>② **卡片列表密度控制**：列表项用极细分隔线 + hover 位移，hover 态是唯一装饰，克制且一致<br>③ 图标/字重体系统一（`font-weight` 只用 2–3 档），没有散落的数字类 |
| **surma.dev**（Surma） | 长文阅读工程 | ① **长文版式**：行宽 60–70ch、字号按 1.25 比例阶梯、代码块与正文用不同背景层级区分 —— 可对照重设我们的 `.prose`<br>② **图片与表格响应式**：宽表格独立滚动容器、图片带 caption 语义 —— 我们 `base.css:99` 已有雏形，可升级为组件<br>③ **`prefers-reduced-motion`** 全站尊重 —— 我们目前 `main { transition: max-width }` 与 ViewTransitions 均未处理 |
| **Astro Blog / Stripe Blog** | DS 驱动的模板化 | ① **同一 Design System 服务 marketing + blog + docs**，blog 只是其中一个模板消费者 —— 正是我们方案 B 想达到的复用状态（projects / digest / portfolio 共用）<br>② **作者 / 日期 / 标签 / 阅读时长组成统一元信息组件**，在所有页面位置表现一致 —— 对应我们 CX-7 与 VC-7 的分散<br>③ OG 图与页面标题由 DS 统一生成，视觉语言自动一致 |

---

## 4. 可立即落地项（Quick Wins）

以下 7 项**不改动任何页面结构、不改动内容、不影响路由**，单项改动均在 1 个文件内，可独立提交 PR。前 4 项合计约 **0.5 人日**，能消掉大部分 P0。

| # | 改进项 | 现状证据 | 具体改法 | 预期收益 | 风险 |
|---|---|---|---|---|---|
| **Q1** | **恢复断点体系** | `tailwind.config.cjs:17-19`，产物仅 640px | `screens` 恢复 `sm 640 / md 768 / lg 1024 / xl 1280`；或维持单断点但在 ESLint 里禁用 `md:`/`lg:`/`xl:` | 消除静默失效的定时炸弹；解锁真正的桌面端布局 | 低（当前 blog 无 md/lg/xl 用法，回归面为零） |
| **Q2** | **正文换中文优先字体栈** | `base.css:32` `font-mono` | 新增 `--font-sans: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`；`body` 改 `font-sans`，`font-mono` 只留给 `code / pre / kbd` | 中文可读性立刻改善；中英混排基线对齐 | 低（字宽变化会轻微影响行末折行，需扫一眼长标题） |
| **Q3** | **补齐焦点可见性** | `Posts.astro:281-285` `outline-none`；`.dir-pill`/`.toggle-btn`/`.copy-code` 无 focus 样式 | 移除 `outline-none`，统一加 `.focus-outline`（已有工具类）+ `focus-visible:border-skin-accent`；给 3 处按钮补 `focus-outline` | 键盘可达性从"部分可用"到"全站可用" | 低 |
| **Q4** | **弱化文本改语义色** | 45 处 `opacity-*`，light 下 `opacity-50`≈3.1:1、`opacity-60`≈4.1:1 | 新增 `--color-text-muted`（≥4.5:1）/ `--color-text-subtle`（≥3:1，仅用于非文本或大字）；批量替换 | 一次性达到 WCAG AA；层级不再随主题漂移 | 中（需逐处确认替换后对比度，建议先改 `opacity-50/60` 共 12 处） |
| **Q5** | **Google Fonts 收窄或移除** | `Layout.astro:88-93` 6 字重 | 改为 2 字重 + `media="print" onload` 异步，或直接切系统字体栈（推荐，配合 Q2 一步到位） | 首屏少 1 个阻塞请求 + 少 6 个字体文件 | 低 |
| **Q6** | **归档页 heading 层级修正** | `Posts.astro:138` + `Card.tsx:51` | 归档页调用 `Card` 时传 `secHeading={false}`（首页已这么做），文章标题降为 h3 | 屏幕阅读器层级正确 | 低 |
| **Q7** | **版心统一为两个令牌** | `base.css:37` / `PostDetails.astro:202` / `Posts.astro:184` | 定义 `--container-prose: 44rem`、`--container-archive: 72rem`，替换 17 处 `max-w-3xl` 与 2 处 `72rem` | 消除列表→文章的版心断裂；后续改版心只改一处 | 中（需确认 `base.css` 全局 `section` 规则不误伤其它页面） |

**不建议现在做的**：动 `Card` 的视觉结构、改暗色主题配色、重排导航顺序 —— 这些等令牌层（方案 A）落地后再做，否则改完还要再改一遍。

---

## 附录：关键指标实测值

| 指标 | 实测 | 来源 |
|---|---|---|
| blog 文章数 | 180 | `src/content/blog/` |
| short-stories / digest | 10 / 85 | `src/content/` |
| 归档页 HTML 体积 | 210 KB | `dist/posts/index.html` |
| 归档页 `<li>` 数量 | 196 | `dist/posts/index.html` |
| 首页 CSS 体积 | 5.9 KB + 4.8 KB | `dist/_astro/index.*.css` |
| 产物中的媒体查询 | 仅 `640px`(×18)、`980px`(×1) | `dist/_astro/*.css` |
| Tailwind 断点声明 | 仅 `sm: 640px` | `tailwind.config.cjs` |
| `opacity-*` 使用 | 45 处 | `src/**` |
| 间距数字类种类 | 30+ 种 | `src/**` |
| 手写 `@media` | 7 处 / 6 文件 | `src/**` |
| light 主题对比度（accent on fill） | ≈ 5.5:1 ✓ | `#006cac` on `#fbfefb` |
| light 主题对比度（text on fill） | ≈ 14.6:1 ✓ | `#282728` on `#fbfefb` |
| `opacity-50` 文本实际对比度 | ≈ 3.1:1 ✗ | 混合计算 |
| `opacity-60` 文本实际对比度 | ≈ 4.1:1 ✗ | 混合计算 |

---

## 落地记录（2026-11-01）

「纸 × 朱批 · Technical Dossier」已全站落地，本节为实施结果与验证数据。

### 交付物

| 层 | 文件 | 说明 |
|---|---|---|
| 令牌层 | `src/styles/tokens.css` | 色板 / 字阶 / 行高 / 间距 8 基数 / 圆角 2 种 / 双版心 / gutter / 动效；含旧 `skin-*` 兼容映射 |
| 基础层 | `src/styles/base.css` | 系统字体栈（去 Google Fonts）、中文行高 1.8、语义文本类、统一 focus-visible |
| 组件层 | `src/styles/prose-blocks.css` + `MetaRow` / `SectionHeader` / `Toc` / `Card.astro` 等 | 文章语义块与元信息组件 |
| 版式层 | `src/styles/editorial.css` | Hero / 统计宫格 / doc-row / 筛选条 / 通用档案零件（doc-row 样式在全局层，供 Astro 与 React Search 共用） |
| Tailwind | `tailwind.config.cjs` | **断点修复**（screens 移入 extend，恢复 640/768/1024/1200/1440）、token 化色板与字阶、prose 重定义（38em 中文行宽） |

### 全站覆盖

- 页面：首页、归档、文章详情（≥1200px 双栏档案式）、标签、404、搜索、digest 三页、projects 两页、shanghai、radio、annotations、about、short-stories。
- 组件：Header / Footer / Breadcrumbs / Tag / Hr / Pagination / LinkButton / ShareLinks / Socials / Search / InlineComments / AnnotationOwnerPanel / RadioPlayer。
- 硬编码色清零：全站不再有 Tailwind 默认色板类与 `skin-*`（唯一豁免：`/portfolio`，它是独立设计的简历页，自带完整视觉语言，根节点显式固定色值，不受主题切换影响）。
- 附带修复：`Datetime.tsx` 死代码删除；OG 图构建不再依赖联网抓字体（本地系统字体优先 → 远端兜底 → 都没有则跳过并告警，构建永不因字体失败）；OG 卡模板重绘为新语言。

### 验证数据

- `astro check`：0 errors / 0 warnings。
- `pnpm build`：通过，545 页。
- WCAG 对比度（12 对前景/背景 × 双主题）：**24/24 全部达标**（正文 15.99:1 / 弱化 4.82:1 / 强调 5.46:1，暗色 15.79 / 6.36 / 6.55）。
- 断点实测：产物含 640/768/1024/1200/1440 媒体查询；390/768/1280 视口探针实测 `scrollWidth ≤ innerWidth`，无横向溢出。
- 173 篇文章 OG 图全部生成；`fonts.googleapis` 请求清零。
- 无头浏览器截图核验：文章页（双栏 + 档案侧栏）、归档页（96px 级 hero + 统计宫格 + 年份分组）、浅/深双主题、移动端布局均正常。

### 遗留与已知取舍

1. **归档页仍是全量渲染**（159KB / 173 条）：新的客户端筛选（领域/标签）依赖全量 DOM，`SITE.postPerPage` 在归档首页仍未生效。标签页与 short-stories 走正常分页。若要收敛体积，需把筛选改成请求级或预计算索引。
2. **`/portfolio` 豁免**：独立视觉语言，未纳入令牌体系。
3. **danger 色**：InlineComments 的删除/危险操作沿用唯一强调色（朱砂），未引入第二种红。
