"""demo.* 命令：用于验证错误码、超时与事件流。"""
from __future__ import annotations

import time
from typing import Any

from ..bridge import Bridge, RequestContext
from ..errors import CommandError


def register(bridge: Bridge) -> None:
    bridge._register("demo.fail", _fail)
    bridge._register("demo.slow", _slow)


def _fail(params: dict[str, Any], _ctx: RequestContext) -> None:
    message = params.get("message", "演示错误：后端主动返回业务错误")
    if not isinstance(message, str):
        raise CommandError("E_INVALID_PARAMS", "message 必须是字符串")
    raise CommandError("E_DEMO", message, {"hint": "这是 demo.fail 的预期错误"})


def _slow(params: dict[str, Any], _ctx: RequestContext) -> dict[str, int]:
    delay_ms = params.get("delayMs")
    if isinstance(delay_ms, bool) or not isinstance(delay_ms, int) or delay_ms < 0:
        raise CommandError("E_INVALID_PARAMS", "delayMs 必须是非负整数")

    delay_ms = min(delay_ms, 15_000)
    time.sleep(delay_ms / 1000)
    return {"delayMs": delay_ms}
