---
pubDatetime: 2024-07-14T20:23:19Z
title: Angular Upgrade from 13 to 17
slug: angular-upgrade-from-13-to-17
featured: false
draft: false
tags:
  - blog
description: 复杂的事情可以拆分小的任务，这样更具有可行性。
---

## 背景

项目是2021年左右从0搭建的项目，使用[Jhipster](https://github.com/jhipster/generator-jhipster)脚手架搭建生成的Angular项目，其中的主要依赖有angular, carbon-components-angular, carbon/icons, rxjs等。累计到2023年12月，累计页面50+，累计通用组件20+。项目不算大，但是功能页面也不少。当时的Angular版本是13。然后到23年12月升级时最新的Angular版本是17，所以升级的难度还是有的。并且Carbon组件库，就是IBM的推出的Carbon Design System由10变为了11，也有非常大的变化。

## 目标

将项目从 Angular 13升级到Angular17，UI 组件库由Carbon 10升级到Carbon11。

## 过程

项目涉及页面50+，通用组件大概20+，最开始升级的时候查了一些资料，考虑使用[Angular CLI](https://www.notion.so/Angular-13-17-2f73ba27ae934ba7bb43dc51fefb4429?pvs=21)来升级，但是当13到14时，遇到了一些eslint警告，当然后面发现这些警告时不时的就会出现。然后感觉不是很好修复。就考虑要不换种方式，通过最新的CLI当时（2023年12月）是Angular17，到升级结束时已经是Angular18，但是因为后面的时间不够了（到了24年6月），Angular18就没有考虑。

那么说回换种方式，考虑使用Angular CLI新建一个空的项目，然后一点点的将功能都移入进来，感觉这是个相对妥善的方式，然后就开始评估时间，评估下来后，预计要3个月左右，时间非常长。然后就开始做了，大概做了2-3周左右。因为当时是12月份，后面就要过年了，过年回来也就是2月份继续这个事情。然后重新评估了3个月时间重新构建新的项目这个方式是否可行，觉得还是过长，且结果不可控，因为相当于重写了所有页面。

然后就又改了方案，跟公司的另一个部门的同事了解他们是如何考虑升级这个事情的，得到的结论是他们将UI组件库封装了一层，比如原来是ibm-table，他们封装一层后变为icw-table，这样做的好处是比如这次由Carbon 10升级到11，所有的组件前缀由ibm-xxx变为了cds-xxx，那么封装的好处是只需要替换一处即可，否则就需要全局去替换。然后就大概花了1-2月的时间去做封装。然后前期从Angular13-15的升级是通过Angular cli来做的，非常好用的工具。

在封装icw-xxx组件和Angular15升级完成后，接下来的大事情就是Carbon10-11这个升级，这个升级参考了[Carbon官方的迁移文档](https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md#carbon-components)和[Carbon-component-angular version4-5](https://github.com/carbon-design-system/carbon-components-angular/wiki/v4-to-v5-upgrade-guide#carbonicons-angular)的变更以及[团队的starter项目](https://github.com/carbon-design-system/carbon-angular-starter)，通过项目的commit信息能够了解很多，这两个对我的帮助很大。然后开始时还是很多报错，有ts版本问题，有Carbon chart图表库问题，所以就很纠结如何解决这个。

突然灵机一动，我把Features下的所有页面都删除了，当然这个是在升级单独的分支上做的。这么做的原因就是将做的事情，拆分为一个一个的小的事情，然后逐个击破。移除了features的页面后，整个项目就只剩了主体layout结构的调整。然后事情似乎能够做了，错误数少了，内心的惶恐也少了。终于解决了主体部分的切换，Carbon11引入成功了。然后的事情就是每个feature替换，就变得容易多了，且一个feature换过之后，剩下来的难度就不大，套路类似。经过了大概几周的时间，Carbon 11+Angular 15就解决了。

然后就升级Angular16，同时替换ibm前缀到cds前缀。这个事情做起来就容易很多，就是多花点时间就好，并不需要多费脑子去想方案。这个完成后，就是最后一步Angular16-17，还是通过Angular CLI来做，当时AI在这个升级过程中也有着举足轻重的作用我的角色，类似中间的操作员，协调者。

升级到Angular17后，其实还有Angular18，只是时间已经到了24年的7月了，后面还要测试和小的调整，所以18暂时就不考虑了，留给老印去解决吧。

## 收获

总计历时5个月左右，终于成功的将Angular升级到17，Carbon升级到11，这次感受最深的事情是，一件事情要是很复杂，看起来无从下手。那么好的方式是要拆分为一个个小的任务，然后逐个去思考解决方案。同时我也很感谢领导的耐心，能够容忍我去犯错，比如一开始的不成熟的方案，后面自己做的过程中逐渐发现了它的不可行性。
