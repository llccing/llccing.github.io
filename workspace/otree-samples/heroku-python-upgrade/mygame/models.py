# mygame/models.py
from otree.api import BaseSubsession, BaseGroup, BasePlayer, Page, WaitPage


class Subsession(BaseSubsession):
    pass


class Group(BaseGroup):
    pass


class Player(BasePlayer):
    pass


class Introduction(Page):
    pass


page_sequence = [Introduction]
