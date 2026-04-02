---
title: "oTree 6.0 Beta 版发布：原生支持 Web API，体验全面升级"
description: "otree 6.0 AI 特性跟进"
image: "/images/post_images/otree6.jpg"
date: 2025-09-13T05:00:00Z
draft: false
---

<!--
can use this for random image
 https://picsum.photos/id/37/800/500 -->
我们激动地宣布 oTree 6.0 Beta 版正式发布！这个版本带来了一系列重量级更新，将极大地改变您构建和管理实验的方式。其中最引人注目的，无疑是原生支持异步 Web API，这意味着您可以将 ChatGPT 等强大的外部服务无缝集成到您的实验中。同时，新版本在用户管理、等待页面和开发调试等方面也做出了大量优化。

让我们一起来看看有哪些激动人心的变化吧！

#### 1. 异步 Web API 支持：在实验中直接调用 ChatGPT！

过去，要在 oTree 实验中调用像 OpenAI 这样的外部 API 是非常困难的。因为一次 API 请求可能会耗时 10 秒以上，如果多个参与者同时请求，服务器很容易因此“卡住”或“冻结”。

现在，oTree 6.0 彻底解决了这个问题！您可以通过全新的 **异步 `live_method`** 来调用 Web API，而不会阻塞服务器。

核心改动如下：
*   **使用 `async` 和 `yield`：** 只需将您的 `live_method` 定义为 `async` (异步)，并用 `yield` 替代 `return`。
*   **流式传输（Streaming）：** 对于聊天机器人等应用，您还可以像打字机一样，将 API 的返回内容以“流”的形式一小块一小块地实时展示给参与者，提升了交互的即时感。

下面是一个调用 ChatGPT 的简单示例：
```python
# 确保您使用的 API 库支持异步调用
# 如果不支持，可以考虑使用 httpx 等库
from openai import AsyncOpenAI

OPENAI_CLIENT = AsyncOpenAI(api_key=OPENAI_KEY)

class MyPage(Page):
    @staticmethod
    async def live_method(player: Player, data):
        # 异步调用 API
        completion = await OPENAI_CLIENT.chat.completions.create(
            model="chatgpt-4o-latest",
            messages=[{"role": "user", "content": data}],
            stream=False,
        )
        # 使用 yield 返回结果
        yield {player.id_in_group: completion.choices[0].message.content}
```

**重要提示：** 异步方法在并行执行时，如果多个参与者同时修改同一个对象（例如 `group`），可能会产生意想不到的结果（即“竞态条件”）。因此，在仅修改当前参与者 (`player`) 数据时，它是完全安全的。

#### 2. 全新的欢迎页面 (Welcome Page)

您是否也曾遇到过这样的烦恼：一些平台（如 WhatsApp）会自动扫描并打开您发送的实验链接，导致这些“机器人访问”被误计为已开始实验的参与者？

oTree 6.0 的新版欢迎页面完美地解决了这个问题。现在，当您使用 `Room` 时，oTree 会默认展示一个欢迎页面，要求用户手动确认后才能正式开始实验。这有效杜绝了因链接被自动打开而浪费参与者名额的情况。

更棒的是，这个欢迎页面是**完全可定制的**！您可以在 `settings.py` 中通过 `welcome_page="MyWelcomePage.html"` 来指定自己的欢迎页面。这意味着，您可以在参与者正式进入实验前，展示知情同意书、进行前置问卷调查或筛选，大大增强了实验设计的灵活性。

#### 3. 更智能的 `group_by_arrival_time` 在线状态检测

对于使用 `group_by_arrival_time` 的等待页面，我们改进了对参与者“挂机”或“不活跃”状态的检测方式。

*   **过去：** oTree 仅通过浏览器标签页是否活跃来判断。
*   **现在：** 如果参与者在 **2 分钟** 内没有任何活动（例如移动鼠标），系统会弹出一个提示框，询问他们是否还在。页面标签上也会显示一个倒计时。
*   如果参与者在 **15 秒** 内没有点击按钮或移动鼠标，他们将被移至一个“不活跃”页面。点击页面上的按钮即可随时返回等待队列。

这些时间参数都是可以配置的，但请注意，此功能目前仍处于实验阶段。

#### 4. 会话级别链接 (Session-wide links) 优化

以前，如果同一个参与者在同一个浏览器中两次打开会话级别的开始链接，会消耗掉两个参与者名额。现在，oTree 会通过 Cookie 检查链接是否已被点击过。如果是，参与者将会从他们上次离开的地方继续实验，而不会重新占用一个名额。

**请注意：** 这个新特性只在非 `demo` 模式下生效。我们依然更推荐您使用 `room` 级别的链接，因为它更稳定可靠。

#### 其他重要更新

*   **数字格式化：** 现在可以在 `settings.py` 中设置 `THOUSAND_SEPARATOR`，例如设置为 `","` 后，大数字会显示为 `1,234,567.00`。
*   **调试更轻松：** 当 `live_method` 出现服务器错误时，浏览器的开发者控制台会直接显示提示，同时服务器端的错误追溯信息也更简洁。
*   **`read_csv()` 增强：** 除了逗号，现在也支持读取用分号分隔的 CSV 文件。
*   **DEBUG 模式:** 在 DEBUG 模式下，页面底部会有一个“作为新参与者开始”的链接，方便测试。
*   **机器人 (Bots)：** 机器人现在支持 `custom_export` 功能。
*   **界面优化：** 在“监控”页面，等待页面上的参与者会以绿色/灰色图标显示其在线状态；`room` 和 `session` 之间的跳转导航也变得更加直观。

### 如何体验？

oTree 6.0 目前为 Beta 测试版，您可以通过以下命令安装和升级：

```bash
pip install otree --upgrade --pre
```

我们鼓励所有实验者和开发者尝试这个新版本，并向我们反馈您的使用体验。oTree 6.0 在拥抱前沿技术和优化用户体验上迈出了一大步，我们已经迫不及待想看到您用它创造出更多精彩的互动实验了！