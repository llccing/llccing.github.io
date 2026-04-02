---
title: "源码分析-"
description: "Heading example Here is example of hedings. You can use this heading by following markdownify rules."
image: "/images/blog-1.jpg"
date: 2025-05-01T05:00:00Z
draft: true
---

### **项目简介**

**• 项目目的**
这个代码仓库 [Repo](https://sa-feedback-ekx-74c008a4b47d.herokuapp.com/demo) 里是一个用 oTree 框架写的实验项目，目的是研究在不同的“处理”（treatment）条件下，人们在一个挖矿游戏里是怎么做决策的。参与者会先完成几个前置部分（Part1-Part3），然后玩一个实时的“任务1”挖矿游戏，最后再做一个调查问卷和标准的风险偏好测试。我们设置了两种实验“处理”，它们最主要的区别就是每一轮游戏的时间限制不一样。

**• 主要组成部分**
- **settings.py**: 定义了两种实验流程的配置、参与者级别的变量，以及一些 oTree 的通用设置（比如货币单位、管理员后台等）。
- **Part1, Part2, Part3, Task1, Survey, risk_quiz/ 这些文件夹**: 每个文件夹都是一个独立的 oTree 应用，分别对应实验中的一个阶段（比如指示语、实验页面、数据模型、网页模板等）。
- **_rooms/**: 存放参与者标签文件，方便实验者在实验开始前，预先把参与者分配到不同的处理组。
- **static, templates 这两个子文件夹**: 存放各个应用会用到的 CSS/JS 文件和 HTML 网页模板。
- **requirements*.txt, runtime.txt, Procfile**: 这些是把项目部署到 Heroku 或类似云平台上所需要的文件。
- **MiningGame_Wilkening_PLS_version2.pdf**: 这是我们的项目审批/研究方案说明书 (PLS)。
- **main.py**: 这是一个遗留的示例脚本，项目本身并没有用到它。

**• 一次典型的实验流程**
1.  **Part1** – 签署知情同意书，填写初始问卷。
2.  **Task1** – 进行多轮的挖矿游戏（需要在开采金矿和购买决策之间权衡），每轮有严格的时间限制（根据不同的处理组，可能是120秒或20秒）。
3.  **Part2 and Part3** – 完成一些后续任务和信息披露环节。
4.  **Survey** – 回答一些关于个人背景和偏好的问题。
5.  **risk_quiz** – 完成一个有现金激励的风险偏好测试。
6.  **最终报酬**会根据参与者在多个环节的表现来计算（包括挖矿收益、风险偏好测试的得分，以及固定的参与费）。

**• 如何部署**
首先在服务器环境变量里设置好管理员密码 `OTREE_ADMIN_PASSWORD`，然后把代码推送到 Heroku，最后为不同的实验场次，分别创建名为 "Treatment_1" 或 "Treatment_2" 的房间（room）就可以了。

**总而言之，这个仓库是一个行为经济学实验项目。它通过一个模拟的挖矿/探矿任务，来比较不同的时间压力如何影响人们的决策行为，实验的最后还附带有调查问卷和风险偏好测试。**