# oTree Secure Session Demo
# 演示如何防止未授权用户加入私有会话

from os import environ
import secrets

# 必需的 SECRET_KEY - 生产环境应该使用环境变量
SECRET_KEY = environ.get('SECRET_KEY', secrets.token_hex(32))

# 管理员密码（本地开发用）
ADMIN_PASSWORD = environ.get('ADMIN_PASSWORD', 'admin')

SESSION_CONFIGS = [
    {
        'name': 'secure_two_player_game',
        'app_sequence': ['secure_game'],
        'num_demo_participants': 2,
        'display_name': 'Secure Two-Player Game (with enhanced security)',
    },
]

# ===========================================
# 🔒 安全增强配置
# ===========================================

# 1. 增加会话代码长度（从默认 8 位增加到 12 位）
# 安全性提升：62^8 → 62^12，约 2 万亿倍
SESSION_CODE_LENGTH = 12

# 2. 使用完整的字符集（大小写字母 + 数字）
SESSION_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

# 3. 启用参与者认证（可选，根据实验需求）
# AUTHENTICATE = True

# 4. 设置会话密码（可选）
# SESSION_CONFIG_DEFAULTS = {
#     'session_password': 'your_secure_password_here',
# }

# ===========================================
# 基础配置
# ===========================================

# 如果设为 True，用户重新连接时会自动创建新会话，防止意外加入他人会话
# 对于需要严格隔离的实验，建议设为 True
CONTINUE_UNIQUE_PARTICIPANT_NAME = False

# 限制每个会话的参与人数
# 在 app 的 models.py 中通过 players_per_group 控制

LANGUAGE_CODE = 'en'

# 禁用调试模式（生产环境）
DEBUG = False

# Heroku 部署所需
SENDSAFE_MODE = environ.get('OTREE_SENDSAFE_MODE', 'default')

# 默认会话配置
SESSION_CONFIG_DEFAULTS = {
    'real_world_currency_per_point': 1,
    'participation_fee': 0,
    'display_name': 'Secure Session Demo',
    'mturk_hit_settings': {},
}
