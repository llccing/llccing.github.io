---
pubDatetime: 2026-05-30T16:30:00+08:00
title: "[译] CLDR：你的 locale 真相来源"
slug: cldr-angular
featured: false
draft: true
isTranslation: true
tags:
  - angular
  - i18n
  - cldr
  - localization
description: CLDR 是 Angular 本地化格式的事实来源。本文通过真实 issue 演示如何判断显示问题到底是 bug 还是数据规范使然。
canonicalURL: https://riegler.fr/blog/2023-09-18-cldr-angular
---

> 原文地址: https://riegler.fr/blog/2023-09-18-cldr-angular

![Image](/blog-images/cldr-angular/kyle-glenn-nXt5HtLmlgE-unsplash.jpg)

对于做过国际化（i18n）应用的人来说，你一定知道这不是一个简单的问题。或者至少过去确实很难，而现在已经好多了。

Angular 通过提供配置与处理 locale 的必要能力，大大降低了我们的工作量。

你只需要导入 locale，并配置 locale provider。

#### **`main.ts`**

```
import '@angular/common/locales/global/fr'
;
bootstrapApplication
(App, {providers: [
{provide: LOCALE_ID
, useValue: 'fr'
}
]
}
)
;
```

随后这些 pipes 就会自动使用该 locale。

#### **`my.component.html`**

```
  {{ date | date: 'dd MMMM yyyy'}} // 2023 年 9 月 16 日（写作时）
  {{ 35.50 | currency }} // 35,50 $US
  {{ 300_000_000 | number }} // 300 000 000
```

就是这么简单。

## CLDR

不过你有没有想过，这些信息到底来自哪里？答案就是 CLDR：Common Locale Data Repository。

CLDR（[wiki](https://en.wikipedia.org/wiki/Common_Locale_Data_Repository)）是 Unicode Consortium 的一个项目，为操作系统和其他软件提供 locale 数据。

尽管 CLDR 官方格式是 XML，但他们也提供了[同样内容的 JSON](https://github.com/unicode-org/cldr-json)。Angular 正是用这些数据来生成 `common` 模块中的 locale 数据。

## 海量且多样的数据

截至 CLDR v44，这个仓库已经支持 600 多种 locale。并且同一种语言可以覆盖多个国家地区（例如 fr-CA 表示加拿大法语、fr-CG 表示刚果（布）法语等）。

### 数字

[这里](https://github.com/unicode-org/cldr-json/tree/f93780d69dbd62550cd0a3eb64aa3c73b2c45e91/cldr-json/cldr-numbers-full/main)有一份数字数据示例。我们看一下 `fr` locale 中法语数字格式定义。

#### **`fr/numbers.json`**

```
    "symbols-numberSystem-latn"
: {
        "decimal"
: ","
,
        "group"
: " "
,
        "timeSeparator"
: ":"
        ...
    }
,
    ...
    "currencyFormats-numberSystem-latn"
: {
        "standard"
: "#,##0.00 ¤"
,
        ...
    }
```

可以看到，小数分隔符是逗号，货币符号（`¤`）位于数字后面，等等。
如果你想了解这些格式的具体含义，可以查看 CLDR 的[在线文档](https://cldr.unicode.org/translation/number-currency-formats/number-and-currency-patterns)。

### 日期

日期是 i18n 中最典型、也最需要正确格式化的数据。CLDR 为此定义了大量相关数据。

这里给一个[韩语日期](https://github.com/unicode-org/cldr-json/blob/f93780d69dbd62550cd0a3eb64aa3c73b2c45e91/cldr-json/cldr-dates-full/main/ko/ca-gregorian.json)的简短示例。

| 韩文 | 英文 |
| ---- | ---- |

| **`ko/ca-gregorian.json`**`"months"
: {
    "format"
: {
        "wide"
: {
            "1"
: "1월"
,
            "2"
: "2월"
,
            "3"
: "3월"
,
            "4"
: "4월"
,
            "5"
: "5월"
,
            "6"
: "6월"
,
            "7"
: "7월"
,
            "8"
: "8월"
,
            "9"
: "9월"
,
            "10"
: "10월"
,
            "11"
: "11월"
,
            "12"
: "12월"
        }
,
    }
}
,
"days"
: {
    "format"
: {
        "abbreviated"
: {
            "sun"
: "일"
,
            "mon"
: "월"
,
            "tue"
: "화"
,
            "wed"
: "수"
,
            "thu"
: "목"
,
            "fri"
: "금"
,
            "sat"
: "토"
        }
,
    }
}
,
...
"dateFormats"
: {
    "full"
: "y년 MMMM d일 EEEE"
,
    "long"
: "y년 MMMM d일"
,
    "medium"
: "y. M. d."
,
    "short"
: "yy. M. d."
}
,` | **`en/ca-gregorian.json`**```
"months"
: {
"format"
: {
"wide"
: {
"1"
: "January"
,
"2"
: "February"
,
"3"
: "March"
,
"4"
: "April"
,
"5"
: "May"
,
"6"
: "June"
,
"7"
: "July"
,
"8"
: "August"
,
"9"
: "September"
,
"10"
: "October"
,
"11"
: "November"
,
"12"
: "December"
}
,
}
}
,
"days"
: {
"format"
: {
"abbreviated"
: {
"sun"
: "Sun"
,
"mon"
: "Mon"
,
"tue"
: "Tue"
,
"wed"
: "Wed"
,
"thu"
: "Thu"
,
"fri"
: "Fri"
,
"sat"
: "Sat"
}
,
}
}
,
...
"dateFormats"
: {
"full"
: "EEEE, MMMM d, y"
,
"long"
: "MMMM d, y"
,
"medium"
: "MMM d, y"
,
"short"
: "M/d/yy"
}
,

```|

### 还有更多

它不仅仅包含格式数据，内容远不止这些。

继续看货币数据，[这里](https://github.com/unicode-org/cldr-json/blob/f93780d69dbd62550cd0a3eb64aa3c73b2c45e91/cldr-json/cldr-core/supplemental/currencyData.json#L1093-L1104)
记录了各个国家的货币历史。以古巴为例，美元在 1959 年之前都是有效货币。这里甚至能看到一点历史课内容：1959 年正是对古巴禁运开始的时间点。

#### **`supplemental/currencyData.json`**

```

    "CU"

: [
{
"CUP"
: {
"_from"
: "1859-01-01"
}
}
,
{
"USD"
: {
"_from"
: "1899-01-01"
,
"_to"
: "1959-01-01"
}
}
,
]

```

## 这是 bug 吗？

那我该如何判断一个显示问题到底是 bug 还是“本来就该这样”的特性？
我会用 Angular 仓库中的几个 issue 来演示。

### 西班牙语环境下 USD 的值应该是什么？

在 [#51671](https://github.com/angular/angular/issues/51671) 这个 issue 中，用户希望意大利语 locale 下的货币符号显示为 `$`。

现在我们既然知道了 CLDR 的存在，就可以直接去[源数据](https://github.com/unicode-org/cldr-json/blob/f93780d69dbd62550cd0a3eb64aa3c73b2c45e91/cldr-json/cldr-numbers-full/main/it/currencies.json#L1112C18-L1112C18)验证。

#### **`it/currencies.json`**

```

    "USD"

: {
"displayName"
: "dollaro statunitense"
,
"displayName-count-one"
: "dollaro statunitense"
,
"displayName-count-other"
: "dollari statunitensi"
,
"symbol"
: "USD"
,
"symbol-alt-narrow"
: "$"
}
,

````

可以看到，意大利语里 USD 的符号确实是 `USD`，而不是 `$`。

➡️ 结果：**✅ 不是 bug**

### 西班牙语月份简称少了一个点号吗？

再看日期格式这个例子，在 [#51317](https://github.com/angular/angular/issues/51317) 中，用户反馈使用 `MMM` 中等格式时，月份简称少了点号。

这项信息位于[gregorian calendar 数据](https://github.com/unicode-org/cldr-json/blob/f93780d69dbd62550cd0a3eb64aa3c73b2c45e91/cldr-json/cldr-dates-full/main/es/ca-gregorian.json#L23)里。

| 西班牙语 | 法语 |
| --- | --- |
| **`es/ca-gregorian.json`**```
"abbreviated"
: {
    "1"
: "ene"
,
    "2"
: "feb"
,
    "3"
: "mar"
,
    "4"
: "abr"
,
    "5"
: "may"
,
    "6"
: "jun"
,
    "7"
: "jul"
,
    "8"
: "ago"
,
    "9"
: "sept"
,
    "10"
: "oct"
,
    "11"
: "nov"
,
    "12"
: "dic"
}
,
``` | **`fr/ca-gregorian.json`**```
    "1"
: "janv."
,
    "2"
: "févr."
,
    "3"
: "mars"
,
    "4"
: "avr."
,
    "5"
: "mai"
,
    "6"
: "juin"
,
    "7"
: "juil."
,
    "8"
: "août"
,
    "9"
: "sept."
,
    "10"
: "oct."
,
    "11"
: "nov."
,
    "12"
: "déc."
}
,
``` |

可以看到，CLDR 在法语简称中使用点号，但在西班牙语中没有。

➡️ 结果：**✅ 不是 bug**

### 负数货币金额缺少空格

最后一个例子是 [#46038](https://github.com/angular/angular/issues/46038)。用户反馈 `de-CH` locale 下，货币与负号之间缺少空格。他期望 `CHF-135.00` 显示为 `CHF -135.00`。

同样，我们来看 [CLDR 数字数据](https://github.com/unicode-org/cldr-json/blob/f93780d69dbd62550cd0a3eb64aa3c73b2c45e91/cldr-json/cldr-numbers-full/main/de-CH/numbers.json#L97-L110)：

````

"currencyFormats-numberSystem-latn"
: {
"standard"
: "¤ #,##0.00;¤-#,##0.00"
,
}

```

CLDR 为瑞士德语货币定义了 2 种模式。可以看到负数模式 `¤-#,##0.00` 中，货币符号（`¤`）与负号之间本来就没有空格。

➡️ 结果：**✅ 不是 bug**

## 最后说明

现在你已经是 CLDR 专家了，可以自己去查看 CLDR 仓库，判断你看到的行为是否符合预期。

如果你发现 CLDR 与 Angular 之间存在差异，可以去 [open an issue](https://github.com/angular/angular/issues/new/choose)，Angular 的 locale 数据可能需要同步到最新 CLDR。或者如果你 100% 确认是 CLDR 本身的数据问题，也可以向 CLDR 提交变更请求，详见[这里](https://github.com/unicode-org/cldr/blob/main/docs/requesting_changes.md)。
```
