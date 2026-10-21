"""命令注册入口：所有命令在此汇总，保持桥接对象只有一个公开方法。"""
from __future__ import annotations

from ..bridge import Bridge
from . import config as config_commands
from . import demo as demo_commands
from . import system as system_commands
from . import window as window_commands


def register_all(bridge: Bridge) -> None:
    system_commands.register(bridge)
    demo_commands.register(bridge)
    window_commands.register(bridge)
    config_commands.register(bridge)
