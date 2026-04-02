---
title: "搭建oTree经济学实验基础结构：从零到一的详细教程"
description: "Heading example Here is example of hedings. You can use this heading by following markdownify rules."
image: "/images/blog-1.jpg"
date: 2025-05-01T05:00:00Z
draft: false
---

*发表于 [otree Study] • 2025年5月 • 阅读时间12分钟*

## 引言

作为一名使用oTree平台多年的开发者，我深知初学者在设计第一个经济学实验时面临的挑战。本教程将带领大家创建一个风险偏好测量实验，采用价格列表法（类似于Holt和Laury, 2002的经典设计）。通过这个过程，你将掌握如何构建一个功能完善的实验来准确测量参与者的风险态度。

## oTree简介

oTree是一个基于Python的开源行为研究平台。在实验经济学领域广受欢迎的主要原因是它能够支持复杂逻辑、随机化处理以及参与者之间的互动决策 — 这些都是经济学实验的核心要素。多年来，我看到oTree已经成为实验经济学领域的主流工具，其灵活性和强大功能让研究者能够实现各种实验设计。

## 前期准备

在开始之前，请确保你已准备好：
- Python 3.12环境
- 安装好oTree（`pip install otree`）
- 基本的Python编程知识
- 文本编辑器或IDE（我个人推荐配置Python扩展的VS Code）

## 项目结构概览

一个典型的oTree实验通常包含以下关键文件：

```
risk_preferences/
├── __init__.py
├── _builtin/
├── models.py        # 定义数据结构和核心逻辑
├── pages.py         # 控制页面的顺序和流程
├── templates/       # 每个页面的HTML模板
│   └── risk_preferences/
│       ├── Introduction.html
│       ├── Decision.html
│       └── Results.html
└── settings.py      # 配置设置
```

让我们一步步构建这个项目。

## 第一步：创建项目

首先，创建一个新的oTree项目：

```bash
otree startproject risk_experiment
cd risk_experiment
```

然后在这个项目中创建一个新的应用：

```bash
otree startapp risk_preferences
```

## 第二步：定义经济模型

编辑`models.py`文件来定义我们的风险偏好测量任务。我将创建一个包含10个决策的价格列表，每个决策要求参与者在安全选项和风险选项之间做出选择：

```python
from otree.api import (
    models, BaseConstants, BaseSubsession, BaseGroup, BasePlayer,
    Currency as c, Page
)
import random

class C(BaseConstants):
    NAME_IN_URL = 'risk_preferences'
    PLAYERS_PER_GROUP = None
    NUM_ROUNDS = 1
  
    # 定义安全选项和风险选项的收益
    safe_option_a = c(2.00)
    safe_option_b = c(1.60)
    risky_option_a = c(3.85)
    risky_option_b = c(0.10)
  
    # 10个决策的概率（百分比）
    probabilities = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

class Subsession(BaseSubsession):
    pass

class Group(BaseGroup):
    pass

class Player(BasePlayer):
    # 用于存储10个决策的字段（0 = 安全选项，1 = 风险选项）
    decision_1 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_2 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_3 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_4 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_5 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_6 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_7 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_8 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_9 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
    decision_10 = models.IntegerField(choices=[[0, '选项A'], [1, '选项B']])
  
    # 用于存储被选中结算的决策编号和结果
    paying_decision = models.IntegerField()
    outcome = models.BooleanField()  # True = 高收益，False = 低收益
  
    # 计算收益的方法
    def determine_payoff(self):
        # 随机选择一个决策用于支付
        self.paying_decision = random.randint(1, 10)
      
        # 获取该决策的选择（0 = 安全选项，1 = 风险选项）
        decision_attr = f'decision_{self.paying_decision}'
        choice = getattr(self, decision_attr)
      
        # 获取所选决策的概率
        prob = C.probabilities[self.paying_decision - 1]
      
        # 确定结果（成功与否）
        self.outcome = random.random() * 100 <= prob
      
        # 根据选择和结果计算收益
        if choice == 0:  # 选择了安全选项
            self.payoff = C.safe_option_a if self.outcome else C.safe_option_b
        else:  # 选择了风险选项
            self.payoff = C.risky_option_a if self.outcome else C.risky_option_b

```

在我多年的oTree编程经验中，我发现清晰定义常量和变量是保证实验可靠性的关键。注意上面代码中如何使用类属性来规范地组织实验参数。

## 第三步：创建页面流程

现在，让我们在`pages.py`中定义页面序列：

```python
class Introduction(Page):
    """介绍页面，包含实验说明"""
    pass

class Decision(Page):
    """参与者做决策的页面"""
    form_model = 'player'
    form_fields = [f'decision_{i}' for i in range(1, 11)]
  
    def vars_for_template(player: Player):
        # Calculate probability pairs for each decision
        probability_pairs = [(p, 100 - p) for p in C.probabilities]
        
        return {
            'probability_pairs': probability_pairs,
            'safe_option_a': C.safe_option_a,
            'safe_option_b': C.safe_option_b,
            'risky_option_a': C.risky_option_a,
            'risky_option_b': C.risky_option_b,
        }
        
    @staticmethod
    def before_next_page(player: Player, timeout_happened):
        player.determine_payoff()

class Results(Page):
    """显示结果和收益的页面"""
  
    def vars_for_template(player: Player):
        return {
            'paying_decision': player.paying_decision,
            'probability': C.probabilities[player.paying_decision - 1],
            'choice': '选项A（安全）' if getattr(player, f'decision_{player.paying_decision}') == 0 else '选项B（风险）',
            'outcome': '高' if player.outcome else '低',
            'payoff': player.payoff,
        }

page_sequence = [Introduction, Decision, Results]
```

这里我运用了一个专业技巧：使用列表推导式（`[f'decision_{i}' for i in range(1, 11)]`）来简洁地定义表单字段，这是一种我在实际项目中常用的高效编程方式。

## 第四步：创建HTML模板

现在，让我们为每个页面创建HTML模板。

首先是`Introduction.html`：

```html
{{ extends "global/Page.html" }}
{{ load otree }}

{{ block title }}
    风险偏好实验介绍
{{ endblock }}

{{ block content }}
    <div class="card">
        <div class="card-body">
            <h5 class="card-title">欢迎参加风险偏好实验</h5>
            <p>
                在本实验中，您将连续做出10个决策，每次在两个选项之间选择：
                <ul>
                    <li><strong>选项A（安全）：</strong> {{ C.safe_option_a }} 的概率为P%，或 {{ C.safe_option_b }} 的概率为(100-P)%</li>
                    <li><strong>选项B（风险）：</strong> {{ C.risky_option_a }} 的概率为P%，或 {{ C.risky_option_b }} 的概率为(100-P)%</li>
                </ul>
            </p>
            <p>
                概率P在10个决策中从10%递增到100%。
                实验结束时，系统会随机选择一个决策用于支付，
                结果将根据该决策对应的概率来确定。
            </p>
        </div>
    </div>

    {{ next_button }}
{{ endblock }}
```

接下来是`Decision.html`：

```html
{{ extends "global/Page.html" }}
{{ load otree }}

{{ block title }}
    您的决策
{{ endblock }}

{{ block content }}
    <p>请在下面10个决策中，每次选择选项A或选项B：</p>
  
    <table class="table table-striped">
        <thead>
            <tr>
                <th>决策</th>
                <th>高收益概率</th>
                <th>选项A（安全）</th>
                <th>选项B（风险）</th>
                <th>您的选择</th>
            </tr>
        </thead>
        <tbody>
            {{ for prob_pair in probability_pairs }}
                <tr>
                    <td>{{ forloop.counter }}</td>
                    <td>{{ prob_pair.0 }}%</td>
                    <td>{{ safe_option_a }} 概率 {{ prob_pair.0 }}%<br>{{ safe_option_b }} 概率 {{ prob_pair.1 }}%</td>
                    <td>{{ risky_option_a }} 概率 {{ prob_pair.0 }}%<br>{{ risky_option_b }} 概率 {{ prob_pair.1 }}%</td>
                    <td>
                        {{ if forloop.counter == 1 }}{{ formfield player.decision_1 }}{{ endif }}
                        {{ if forloop.counter == 2 }}{{ formfield player.decision_2 }}{{ endif }}
                        {{ if forloop.counter == 3 }}{{ formfield player.decision_3 }}{{ endif }}
                        {{ if forloop.counter == 4 }}{{ formfield player.decision_4 }}{{ endif }}
                        {{ if forloop.counter == 5 }}{{ formfield player.decision_5 }}{{ endif }}
                        {{ if forloop.counter == 6 }}{{ formfield player.decision_6 }}{{ endif }}
                        {{ if forloop.counter == 7 }}{{ formfield player.decision_7 }}{{ endif }}
                        {{ if forloop.counter == 8 }}{{ formfield player.decision_8 }}{{ endif }}
                        {{ if forloop.counter == 9 }}{{ formfield player.decision_9 }}{{ endif }}
                        {{ if forloop.counter == 10 }}{{ formfield player.decision_10 }}{{ endif }}
                    </td>
                </tr>
            {{ endfor }}
        </tbody>
    </table>

    {{ next_button }}
{{ endblock }}
```

最后是`Results.html`：

```html
{{ extends "global/Page.html" }}
{{ load otree }}

{{ block title }}
    实验结果
{{ endblock }}

{{ block content }}
    <div class="card">
        <div class="card-body">
            <h5 class="card-title">支付计算</h5>
            <p>系统随机选择了决策 {{ paying_decision }} 用于支付。</p>
            <p>在这个决策中，高收益的概率为 {{ probability }}%。</p>
            <p>您选择了 {{ choice }}。</p>
            <p>结果是：{{ outcome }}收益。</p>
            <p>您的报酬为：{{ payoff }}。</p>
        </div>
    </div>

    {{ next_button }}
{{ endblock }}
```

从我的经验来看，使用Bootstrap卡片组件能使实验界面更加整洁美观，也便于参与者理解实验流程。

## 第五步：配置设置

编辑项目根目录下的`settings.py`文件，将你的应用包含进去：

```python
from os import environ

SESSION_CONFIGS = [
    dict(
        name='risk_preferences',
        display_name="风险偏好实验",
        num_demo_participants=10,
        app_sequence=['risk_preferences'],
    ),
]

# 其他设置...
LANGUAGE_CODE = 'zh-hans'  # 设置为中文
REAL_WORLD_CURRENCY_CODE = 'CNY'  # 使用人民币
USE_POINTS = False
DEMO_PAGE_INTRO_HTML = ""
PARTICIPANT_FIELDS = []
SESSION_FIELDS = []

ROOMS = [
    dict(
        name='econ_lab',
        display_name='经济学实验室',
    ),
]
```

## 第六步：运行实验

现在你可以运行你的实验了：

```bash
otree devserver
```

在浏览器中访问 http://localhost:8000 查看管理界面。在那里，你可以创建会话并测试你的实验。

## 数据分析

收集数据后，你可以从管理界面以各种格式（CSV、Excel）下载数据。

## 扩展与变种

这个基本结构可以扩展实现各种经济学实验：

1. **公共品博弈**：添加对群体账户的贡献和乘数效应
2. **最后通牒博弈**：添加提议者/回应者角色及接受/拒绝决策
3. **信任博弈**：添加顺序行动与投资回报决策
4. **市场实验**：添加多个交易者的买卖决策



## 结论

至此，你已经成功搭建了一个完整的oTree风险偏好测量实验。这个基础为你实现更复杂的经济学实验提供了工具，同时保持了模型、页面和模板的核心结构。

作为一个有着多年经验的oTree实验设计者，我强烈建议在正式实验前进行充分的测试，并仔细考虑你的实验设计如何与经济理论相契合。记住，好的实验不仅仅是好的代码，更是精心设计的激励机制和清晰的参与者体验。

---

**关于作者**：Rowan是otree开发专家，专注于otree开发多年，经验丰富。

---

本教程的完整代码可在以下仓库获取：<a href="https://github.com/The-Three-Fish/risk_preferences" target="_blank">github.com/The-Three-Fish/risk_preferences</a>

该实验的heroku地址 => <a href="https://xd-risk-preferences-4a810d33050a.herokuapp.com/demo">https://xd-risk-preferences-4a810d33050a.herokuapp.com/demo</a>