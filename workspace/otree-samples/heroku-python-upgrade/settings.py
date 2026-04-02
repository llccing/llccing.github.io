# oTree Heroku Python Upgrade Demo
# 演示如何从 Python 3.9 迁移到 3.11+

from os import environ
import secrets

# 必需的 SECRET_KEY
SECRET_KEY = environ.get('SECRET_KEY', secrets.token_hex(32))
ADMIN_PASSWORD = environ.get('ADMIN_PASSWORD', 'admin')

SESSION_CONFIGS = [
    {
        'name': 'mygame',
        'app_sequence': ['mygame'],
        'num_demo_participants': 2,
        'display_name': 'My Game (Python 3.11+)',
    },
]

# ===========================================
# 🐍 Python 版本配置
# ===========================================
# 使用 .python-version 文件 (推荐)
# 或使用 runtime.txt (旧方式)
#
# 不要在这里硬编码 Python 版本！
# Heroku 会读取 .python-version 或 runtime.txt

# ===========================================
# 基础配置
# ===========================================

CONTINUE_UNIQUE_PARTICIPANT_NAME = False
LANGUAGE_CODE = 'en'
DEBUG = False

SESSION_CONFIG_DEFAULTS = {
    'real_world_currency_per_point': 1,
    'participation_fee': 0,
    'display_name': 'Python Upgrade Demo',
}

# Heroku 生产环境
if environ.get('DYNO'):
    DEBUG = False
    SENDSAFE_MODE = 'production'
