# secure_game/models.py
# 演示安全的 oTree 会话配置

from otree.api import (
    BaseSubsession,
    BaseGroup,
    BasePlayer,
    models,
    Page,
    WaitPage,
)
import random


class Subsession(BaseSubsession):
    """
    安全会话示例 Subsession
    
    在 before_page_load 中可以添加额外的安全检查
    """
    
    def before_page_load(self):
        """
        每次页面加载前执行
        可以添加自定义安全检查逻辑
        """
        # 示例：检查参与者是否有有效的 session code
        # 实际项目中可以在这里添加 IP 限制、时间窗口检查等
        pass


class Group(BaseGroup):
    """
    双人游戏组
    """
    pass


class Player(BasePlayer):
    """
    参与者
    """
    # 可以添加自定义字段来追踪参与者信息
    verification_code = models.StringField(
        label="Your verification code",
        help_text="This code helps verify your identity"
    )
    
    # 记录参与时间
    join_timestamp = models.StringField()


# ===========================================
# Pages
# ===========================================

class Introduction(Page):
    """
    欢迎页面 - 包含安全提示
    """
    
    @staticmethod
    def vars_for_template(player):
        # 生成一个随机验证码，用于后续验证
        player.verification_code = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
        player.join_timestamp = str(player.participant.id)
        
        return {
            'verification_code': player.verification_code,
            'session_code': player.participant.session.code,
        }
    
    @staticmethod
    def is_displayed(player):
        # 只在第一页显示
        return player.round_number == 1


class TaskPage(Page):
    """
    任务页面示例
    """
    pass


class ResultsPage(Page):
    """
    结果页面
    """
    pass


page_sequence = [Introduction, TaskPage, ResultsPage]
