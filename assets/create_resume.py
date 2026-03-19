#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import fitz

def create_resume():
    doc = fitz.open()
    page = doc.new_page()
    
    # Colors
    title_color = (0.1, 0.1, 0.1)
    heading_color = (0.17, 0.24, 0.31)
    text_color = (0.2, 0.2, 0.2)
    
    # Positions
    y_pos = 2
    left_margin = 50
    right_margin = 550
    
    def add_text(text, font_size, y, is_bold=False, color=title_color):
        font_flags = 0
        if is_bold:
            font_flags = 2
        page.insert_text((left_margin, y), text, fontsize=font_size, color=color, fontname="helv" if font_size < 12 else "helv")
        return y + font_size + 2
    
    def add_section(title, y):
        y = add_text(title, 11, y, is_bold=True, color=heading_color)
        return y + 3
    
    def add_line(text, y):
        y = add_text(text, 9, y, color=text_color)
        return y + 1
    
    # Title
    y_pos = add_text("刘春峰 Rowan Liu (1992.01.10)", 16, y_pos, is_bold=True, color=title_color)
    y_pos += 5
    
    # Contact
    y_pos = add_text("求职意向：全栈开发工程师", 10, y_pos, color=text_color)
    y_pos = add_text("15542461419", 10, y_pos + 150, color=text_color)
    y_pos = add_text("lcf33123@163.com", 10, y_pos + 150, color=text_color)
    y_pos = add_text("现住址：上海市", 10, y_pos + 150, color=text_color)
    y_pos = add_text("Blog: https://rowanliu.com", 10, y_pos + 150, color=text_color)
    y_pos += 25
    
    # Education
    y_pos = add_section("教育背景", y_pos)
    y_pos = add_line("2012.09~2016.06  黑龙江八一农垦大学  计算机科学与技术  本科", y_pos)
    y_pos += 15
    
    # Work Experience
    y_pos = add_section("工作经验", y_pos)
    
    # Current role
    y_pos = add_line("埃森哲（上海）有限公司  全栈开发工程师  2024.10~至今  上海", y_pos)
    y_pos = add_line("客户：国泰航空 (Cathay Pacific Airways)", y_pos)
    y_pos = add_line("技术栈：Angular (主力), Node.js (API 转发)", y_pos)
    y_pos = add_line("1. 践行敏捷开发，每两周 Sprint，包含 Planning/Review/Retrospective", y_pos)
    y_pos = add_line("2. 参与 Refinement Meeting，进行 Story Grooming 和 Backlog 筛选", y_pos)
    y_pos = add_line("3. 及时识别风险，通过 Story Point 调整或 Story Split 确保交付", y_pos)
    y_pos = add_line("4. 支持 UAT 和 Regression Testing，预留 Buffer 应对突发需求", y_pos)
    y_pos = add_line("5. 结合 GitHub Copilot 和 Claude 3.5/3.6 进行 AI 辅助开发", y_pos)
    y_pos += 10
    
    # Previous roles
    y_pos = add_line("凌翔创意软件（北京）有限公司大连分公司  全栈开发工程师  2022.04~2024.09  大连", y_pos)
    y_pos = add_line("1. 主导 iCluster Web 开发 (Angular/Tailwind/Spring Boot)", y_pos)
    y_pos = add_line("2. 封装 Keycloak 功能，Angular 13 升级至 15", y_pos)
    y_pos += 8
    
    y_pos = add_line("大连英诺瑞新科技有限公司  全栈开发工程师  2020.07~2022.04  大连", y_pos)
    y_pos = add_line("1. Angular/NestJS/TypeORM 动态表单开发", y_pos)
    y_pos = add_line("2. 阿斯利康诊所项目 (Uniapp)", y_pos)
    y_pos = add_line("3. Code Review 及指导初级工程师", y_pos)
    y_pos += 8
    
    y_pos = add_line("北京嘀嘀无限科技发展有限公司  高级前端开发工程师  2019.11~2020.07  北京", y_pos)
    y_pos = add_line("1. 司机端 H5 开发，Vue CLI 升级", y_pos)
    y_pos = add_line("2. MPX 框架微信小程序开发", y_pos)
    y_pos += 8
    
    y_pos = add_line("北京京东尚科信息技术有限公司  前端开发工程师  2017.09~2019.11  北京", y_pos)
    y_pos = add_line("1. Vue.js 重构 IDC 平台 (10 万行代码，80+ 页面)", y_pos)
    y_pos = add_line("2. 开发 idc-cli 脚手架工具", y_pos)
    y_pos += 8
    
    y_pos = add_line("北京博图纵横科技有限责任公司  前端开发工程师  2016.02~2017.08  北京", y_pos)
    y_pos = add_line("1. Requirejs/Bootstrap/jQuery 项目框架搭建", y_pos)
    y_pos += 15
    
    # Skills
    y_pos = add_section("技能特长", y_pos)
    y_pos = add_line("1. 精通 Vue/Angular/TypeScript/TailwindCSS", y_pos)
    y_pos = add_line("2. 熟悉 uniapp/mpx/微信原生小程序开发", y_pos)
    y_pos = add_line("3. 掌握 NodeJS/Spring Boot 后端开发", y_pos)
    y_pos = add_line("4. 深入理解敏捷开发 (Sprint/Planning/Review/Retrospective/Refinement)", y_pos)
    y_pos = add_line("5. 熟练运用 AI 编程工具 (GitHub Copilot/Claude 3.5/3.6)", y_pos)
    y_pos = add_line("6. 技术博客写作，X(Twitter)/Medium/GitHub 技术分享", y_pos)
    y_pos += 10
    
    # Other
    y_pos = add_section("其他", y_pos)
    y_pos = add_line("语言：英语 (Workable), CET-4", y_pos)
    
    # Save
    doc.save("/root/.openclaw/workspace/blog/public/assets/resume.pdf")
    doc.close()
    print("Resume PDF generated successfully!")

if __name__ == "__main__":
    create_resume()
