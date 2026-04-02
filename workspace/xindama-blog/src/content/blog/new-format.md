---
title: "oTree 新写法（New Format）一文看懂：从老格式到单文件、静态方法的过渡"
description: "otree 5带来了新的变化，跟我一起看有哪些要注意的地方"
image: "/images/blog-4.jpg"
date: 2025-08-21T05:00:00Z
draft: false
---

我前阵子把一个老项目从 oTree 旧格式迁到“新写法”，一路踩坑，也把官方文档 [https://www.otree.org/newformat.html](https://www.otree.org/newformat.html) 翻了个底朝天。下面这篇就按“能跑起来、能维护、能迁移”的思路，把新写法讲清楚。看完你就能用最新写法开工，或者把旧项目平稳升级。

---

## 一、到底什么是“新写法”

- 单文件：一个 app 用一个 Python 文件（通常是 app 目录下的 `__init__.py`）就能写完，不再分 `models.py / pages.py`。
- Page/WaitPage 方法改成 `@staticmethod`，不再用 `self`；方法第一个参数直接拿到 `player/group/subsession`。
- 常量类从 `Constants` 简写为 `C`。
- 货币使用 `cu()`（currency utility），例如 `cu(100)`。
- 会话钩子与管理报表用模块级函数，例如 `creating_session(subsession)`、`vars_for_admin_report(subsession)`。

这套新写法从 oTree 5 开始普及，官方推荐。写起来更短，减少“在类里套方法”的心智负担。

---

## 二、最小可运行示例

假设你的 app 叫 `survey`，目录结构大概是：

- `survey/__init__.py`
- `survey/templates/survey/Intro.html`
- `survey/templates/survey/Results.html`

`__init__.py` 示例：

```python
from otree.api import *

doc = """
一个最小示例：收年龄，展示结果
"""

class C(BaseConstants):
    NAME_IN_URL = 'survey'
    PLAYERS_PER_GROUP = None
    NUM_ROUNDS = 1

class Subsession(BaseSubsession):
    pass

class Group(BaseGroup):
    pass

class Player(BasePlayer):
    age = models.IntegerField(min=18, max=99, label='你的年龄')

class Intro(Page):
    form_model = 'player'
    form_fields = ['age']

class Results(Page):
    @staticmethod
    def vars_for_template(player: Player):
        return dict(age=player.age)

page_sequence = [Intro, Results]
```

对应模板 `Intro.html`：

```html
{% block title %}填写信息{% endblock %}
{% block content %}
  {{ formfields }}
  {{ next_button }}
{% endblock %}
```

对应模板 `Results.html`：

```html
{% block title %}结果{% endblock %}
{% block content %}
  你的年龄是：{{ age }}
  {{ next_button }}
{% endblock %}
```

---

## 三、文件结构与命名规则（和旧版有什么不同）

- 单文件：一个 app 只需要 `__init__.py`；以前的 `models.py`、`pages.py` 合并到一起。
- 常量类：`Constants → C`；属性仍是 `NAME_IN_URL / NUM_ROUNDS / PLAYERS_PER_GROUP`。
- 模板命名：模板文件名需与 `Page/WaitPage` 类名一致（`Intro → Intro.html`），并放在 `templates/你的app名/` 下。
- 页面顺序：`page_sequence = [PageA, PageB, ...]` 放在文件末尾。

---

## 四、页面方法：全面“静态方法风格”

常用方法对照（旧 → 新）：
- `is_displayed(self)` → `@staticmethod is_displayed(player)`
- `vars_for_template(self)` → `@staticmethod vars_for_template(player)`
- `before_next_page(self, timeout_happened)` → `@staticmethod before_next_page(player, timeout_happened)`
- `error_message(self, values)` → `@staticmethod error_message(player, values)`
- `get_form_fields(self)` → `@staticmethod get_form_fields(player)`（动态表单时用）
- `get_timeout_seconds(self)` → `@staticmethod get_timeout_seconds(player)`
- `js_vars(self)` → `@staticmethod js_vars(player)`
- `app_after_this_page(self, upcoming_apps)` → `@staticmethod app_after_this_page(player, upcoming_apps)`

WaitPage 对照：
- `after_all_players_arrive(self)` → `@staticmethod after_all_players_arrive(group)`
- `is_displayed(self)` → `@staticmethod is_displayed(player)`

示例：动态表单字段与超时

```python
class Decide(Page):
    @staticmethod
    def get_form_fields(player: Player):
        # 根据轮次动态变更
        return ['age'] if player.round_number == 1 else []

    @staticmethod
    def get_timeout_seconds(player: Player):
        return 60
```

---

## 五、会话与匹配：creating_session 等“钩子”的新写法

旧版很多逻辑写在类方法里（比如 `Subsession.creating_session`）。新写法直接写模块级函数：

```python
def creating_session(subsession: Subsession):
    # 开场分组、处理 treatment、读取 session.config 等都在这里
    if subsession.round_number == 1:
        subsession.group_randomly()
```

管理员报告：

```python
def vars_for_admin_report(subsession: Subsession):
    players = subsession.get_players()
    return dict(n_players=len(players))
```

---

## 六、Currency 的推荐写法：cu()

- 推荐：`C.ENDOWMENT = cu(100)`
- 模板里直接 `{{ C.ENDOWMENT }}` 会自动以货币格式显示
- Python 中参与加减乘除时与数字类似，但保持货币类型

示例：

```python
class C(BaseConstants):
    ENDOWMENT = cu(100)
    CONVERSION_RATE = 0.2

class Player(BasePlayer):
    payoff_tokens = models.CurrencyField(initial=cu(0))

class Results(Page):
    @staticmethod
    def vars_for_template(player: Player):
        cash = player.payoff_tokens * C.CONVERSION_RATE
        return dict(cash=cash)
```

---

## 七、模板层的小技巧

- 一键渲染所有字段：`{{ formfields }}`；渲染单个字段：`{{ formfield 'age' }}`
- 下一步按钮：`{{ next_button }}`
- 常见对象可直接用：`player / group / subsession / session / C`
- 判断与循环使用 Jinja 语法：`{% if %}`、`{% for %}`

示例（显示分组编号）：

```html
组号：{{ player.group.id_in_subsession }}
```

---

## 八、分组与到达式匹配（group_by_arrival_time）

等候页里仍然用类属性：

```python
class Match(WaitPage):
    group_by_arrival_time = True

    @staticmethod
    def after_all_players_arrive(group: Group):
        # 所有本组玩家到齐后执行
        for p in group.get_players():
            p.payoff = cu(10)
```

---

## 九、从旧项目迁移：一张“替换清单”

- 合并文件：把 `models.py`、`pages.py` 内容合并到 `__init__.py`。
- 常量类重命名：`class Constants → class C`。
- 方法改静态：
  - `self → player`（Page），`self → group`（WaitPage），`self → subsession`（admin report）
  - 如 `self.player.age → player.age`；`self.group → player.group`
- `creating_session`：
  - 旧：`class Subsession(BaseSubsession): def creating_session(self): ...`
  - 新：`def creating_session(subsession): ...`
- 货币：
  - 旧：`from otree.api import Currency as c` → 新：`from otree.api import cu`；把 `c(...)` 改为 `cu(...)`
- 模板路径：确认模板放在 `templates/你的app名/`，文件名与 Page 类对齐
- 导入：推荐 `from otree.api import *`（省事、版本兼容好）

---

## 十、常见坑位与排查

- 模板找不到：通常是模板名与 Page 类名不一致，或放错目录（要放在 `templates/你的app名/`）。
- 忘记 `@staticmethod`：页面方法没加装饰器会报错，或者 `self` 未定义。
- `values` 使用：`error_message(player, values)` 里 `values` 是用户提交的数据 dict，字段名要和 `form_fields` 一致。
- 超时逻辑：`get_timeout_seconds` 返回 `None` 表示不设定超时；`before_next_page` 的 `timeout_happened` 参数用来区分是否因超时跳转。
- 机器人/自测：Bots 写法略有差异，升级后参考官方示例；确保 `yield PageName, dict(...)` 的字段名与 `form_fields` 对齐。

---

## 十一、一个稍完整的演示（含 WaitPage 与结算）

```python
from otree.api import *

class C(BaseConstants):
    NAME_IN_URL = 'pg'
    PLAYERS_PER_GROUP = 4
    NUM_ROUNDS = 1
    ENDOWMENT = cu(20)
    MPCR = 0.5

class Subsession(BaseSubsession):
    pass

class Group(BaseGroup):
    total_contrib = models.CurrencyField()

class Player(BasePlayer):
    contrib = models.CurrencyField(min=0, max=C.ENDOWMENT, label='你愿意投入公共账户的金额')

def creating_session(subsession: Subsession):
    if subsession.round_number == 1:
        subsession.group_randomly()

class Contribute(Page):
    form_model = 'player'
    form_fields = ['contrib']

class WaitAll(WaitPage):
    @staticmethod
    def after_all_players_arrive(group: Group):
        total = sum(p.contrib for p in group.get_players())
        group.total_contrib = total
        for p in group.get_players():
            private = C.ENDOWMENT - p.contrib
            share = total * C.MPCR / C.PLAYERS_PER_GROUP
            p.payoff = private + share

class Results(Page):
    @staticmethod
    def vars_for_template(player: Player):
        g = player.group
        return dict(
            total=g.total_contrib,
            my_contrib=player.contrib,
            payoff=player.payoff,
        )

page_sequence = [Contribute, WaitAll, Results]
```

模板 `Contribute.html`：

```html
{% block title %}公共品决策{% endblock %}
{% block content %}
  你的初始资金：{{ C.ENDOWMENT }}
  {{ formfields }}
  {{ next_button }}
{% endblock %}
```

模板 `Results.html`：

```html
{% block title %}结果{% endblock %}
{% block content %}
  本组总投入：{{ total }}<br>
  你的投入：{{ my_contrib }}<br>
  你的收益：{{ payoff }}
  {{ next_button }}
{% endblock %}
```

---

## 结语

新写法的核心就三点：单文件、静态方法、`cu()`。上手成本不高，但能让代码更短更清晰。若你是从老项目迁移，先把“替换清单”过一遍，再逐页跑通；若是新项目，直接按“最小示例”搭骨架，边写边跑最省心。

如果你已经在用新写法，也欢迎把你遇到的坑留言交流。祝大家实验顺利、部署无坑、数据好看！