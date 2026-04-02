#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# Register Chinese font
try:
    pdfmetrics.registerFont(TTFont('SimSun', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'))
except:
    try:
        pdfmetrics.registerFont(TTFont('SimSun', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'))
    except:
        pdfmetrics.registerFont(TTFont('SimSun', '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf'))

def create_resume():
    doc = SimpleDocTemplate(
        "/root/.openclaw/workspace/blog/public/assets/resume.pdf",
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='SimSun'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=8,
        spaceBefore=12,
        fontName='SimSun'
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=4,
        fontName='SimSun'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=3,
        fontName='SimSun'
    )
    
    story = []
    
    # Title
    story.append(Paragraph("刘春峰 Rowan Liu（1992.01.10）", title_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Contact info
    contact_info = [
        ["求职意向：全栈开发工程师", "15542461419", "lcf33123@163.com"],
        ["现住址：上海市", "Blog：https://rowanliu.com", ""]
    ]
    contact_table = Table(contact_info, colWidths=[6*cm, 5*cm, 5*cm])
    contact_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'SimSun'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#2c3e50')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(contact_table)
    story.append(Spacer(1, 0.5*cm))
    
    # Education
    story.append(Paragraph("教育背景", heading_style))
    story.append(Paragraph("2012.09~2016.06  黑龙江八一农垦大学  计算机科学与技术  本科", normal_style))
    story.append(Spacer(1, 0.5*cm))
    
    # Work Experience
    story.append(Paragraph("工作经验", heading_style))
    
    # Current role
    story.append(Paragraph("<b>埃森哲（上海）有限公司</b>  <b>全栈开发工程师</b>  <b>2024.10~至今</b>  <b>上海</b>", subheading_style))
    story.append(Paragraph("客户：国泰航空 (Cathay Pacific Airways) - 香港航空公司", normal_style))
    story.append(Paragraph("技术栈：Angular (主力), Node.js (API 转发)", normal_style))
    story.append(Paragraph("1. 践行敏捷开发方法论，每两周一个 Sprint，包含 Planning、Review、Retrospective 等完整仪式。", normal_style))
    story.append(Paragraph("2. 参与 Sprint Refinement Meeting，进行 Story Grooming，从 Backlog 筛选 Story 并确定 Sprint 范围。", normal_style))
    story.append(Paragraph("3. 在 Sprint 过程中及时识别风险，通过 Story Point 调整或 Story Split 确保交付质量。", normal_style))
    story.append(Paragraph("4. 支持 UAT 和 Regression Testing，预留 Buffer 应对突发需求。", normal_style))
    story.append(Paragraph("5. 结合 GitHub Copilot 和 Claude 3.5/3.6 进行 AI 辅助开发，显著提升开发效率。", normal_style))
    story.append(Spacer(1, 0.4*cm))
    
    # Previous roles
    story.append(Paragraph("<b>凌翔创意软件（北京）有限公司大连分公司</b>  <b>全栈开发工程师</b>  <b>2022.04~2024.09</b>  <b>大连</b>", subheading_style))
    story.append(Paragraph("1. 主导 iCluster Web 产品开发，技术栈包括 Angular、Tailwind CSS、Spring Boot。", normal_style))
    story.append(Paragraph("2. 学习 Jhipster 工具链，在 Spring Boot 中封装 Keycloak 的相关功能，提升易用性。", normal_style))
    story.append(Paragraph("3. 分析需求，用 Figma 设计产品改进原型，提高用户满意度。", normal_style))
    story.append(Paragraph("4. 研究并制定 Angular 升级，涵盖风险评估，成功从 13 升级至 15，提升性能及开发体验。", normal_style))
    story.append(Spacer(1, 0.4*cm))
    
    story.append(Paragraph("<b>大连英诺瑞新科技有限公司</b>  <b>全栈开发工程师</b>  <b>2020.07~2022.04</b>  <b>大连</b>", subheading_style))
    story.append(Paragraph("1. 掌握 Angular、NG-ZORRO、RxJS、NestJS、TypeORM，开发动态表单功能。", normal_style))
    story.append(Paragraph("2. 为阿斯利康开发诊所项目小程序与 PC 端，使用 Uniapp 编写基础代码和公共组件。", normal_style))
    story.append(Paragraph("3. 基于 ABP 项目封装业务组件库和前端 Layout 组件，增强复用性。", normal_style))
    story.append(Paragraph("4. 负责评估工作量、任务分配、Code Review 及指导初级工程师。", normal_style))
    story.append(Spacer(1, 0.4*cm))
    
    story.append(Paragraph("<b>北京嘀嘀无限科技发展有限公司</b>  <b>高级前端开发工程师</b>  <b>2019.11~2020.07</b>  <b>北京</b>", subheading_style))
    story.append(Paragraph("1. 负责开发司机日常活动的 C 端 H5 页面，与设计师紧密合作实现 99% 的设计还原度。", normal_style))
    story.append(Paragraph("2. 研究 Vue CLI 升级组内公共插件，以兼容@vue/cli@4。", normal_style))
    story.append(Paragraph("3. 快速掌握 MPX 框架，高效开发微信小程序，确保项目按期完成。", normal_style))
    story.append(Spacer(1, 0.4*cm))
    
    story.append(Paragraph("<b>北京京东尚科信息技术有限公司</b>  <b>前端开发工程师</b>  <b>2017.09~2019.11</b>  <b>北京</b>", subheading_style))
    story.append(Paragraph("1. 学习使用 Vue.js 从 0 到 1 重构 IDC 基础设施平台，总计 10 万行代码，80 多个页面。", normal_style))
    story.append(Paragraph("2. 开发工单业务模块，充分了解 Vue 的高级特性，使代码解耦，便于协同开发。", normal_style))
    story.append(Paragraph("3. 开发了 https://github.com/jdidc/idc-cli，创建工单模板的脚手架，提高工单的开发效率。", normal_style))
    story.append(Paragraph("4. 引入埋点采集工具，针对页面和指定位置采集，为 PM 分析功能使用情况提供数据支撑。", normal_style))
    story.append(Spacer(1, 0.4*cm))
    
    story.append(Paragraph("<b>北京博图纵横科技有限责任公司</b>  <b>前端开发工程师</b>  <b>2016.02~2017.08</b>  <b>北京</b>", subheading_style))
    story.append(Paragraph("1. 使用 Requirejs、Bootstrap、jQuery、HTML、CSS3 进行整个项目的框架搭建。", normal_style))
    story.append(Paragraph("2. 引入 Gulp、browser-sync 等工具提高开发效率。", normal_style))
    story.append(Spacer(1, 0.5*cm))
    
    # Skills
    story.append(Paragraph("技能特长", heading_style))
    story.append(Paragraph("1. 精通 Vue 系列、Angular 系列、Typescript、TailwindCSS 等前端技术栈。", normal_style))
    story.append(Paragraph("2. 熟悉 uniapp、mpx、微信原生等工具开发小程序。", normal_style))
    story.append(Paragraph("3. 掌握 NodeJS、Springboot 进行后端开发。", normal_style))
    story.append(Paragraph("4. 深入理解敏捷开发流程（Sprint Planning/Review/Retrospective、Refinement、Story Grooming）。", normal_style))
    story.append(Paragraph("5. 熟练运用 AI 编程工具（GitHub Copilot、Claude 3.5/3.6）提升开发效率。", normal_style))
    story.append(Paragraph("6. 能够分析功能需求，制定开发计划，并指导新员工。", normal_style))
    story.append(Paragraph("7. 积极自学，写博客并通过 X (Twitter)/Medium/Github 等了解技术趋势和行业动态。", normal_style))
    story.append(Spacer(1, 0.5*cm))
    
    # Other
    story.append(Paragraph("其他", heading_style))
    story.append(Paragraph("- 语言：英语（Workable），CET-4", normal_style))
    
    doc.build(story)
    print("Resume PDF generated successfully!")

if __name__ == "__main__":
    create_resume()
