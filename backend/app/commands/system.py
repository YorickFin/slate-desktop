"""system.* 与 bridge.hello 命令。"""
from __future__ import annotations

import os
import platform as platform_module
import sys
from importlib.metadata import PackageNotFoundError, version
from typing import Any

from ..bridge import PROTOCOL_VERSION, Bridge, RequestContext
from ..errors import CommandError
from ..paths import CONFIG_DIR, FRONTEND_DIST


def register(bridge: Bridge) -> None:
    bridge._register("bridge.hello", _hello)
    bridge._register("system.info", _info)
    bridge._register("system.echo", _echo)


def _hello(params: dict[str, Any], ctx: RequestContext) -> dict[str, Any]:
    protocol = params.get("protocol")
    if protocol != PROTOCOL_VERSION:
        raise CommandError(
            "E_INVALID_PARAMS",
            "协议版本不匹配",
            {"expected": PROTOCOL_VERSION, "actual": protocol},
        )

    client = params.get("client")
    if not isinstance(client, str) or not client:
        raise CommandError("E_INVALID_PARAMS", "client 必须为非空字符串")

    ctx.bridge._start_ticker()
    server = "slate-backend"
    ctx.bridge._emit("bridge.ready", {"protocol": PROTOCOL_VERSION, "server": server})

    return {
        "server": server,
        "protocol": PROTOCOL_VERSION,
        "pid": os.getpid(),
        "startedAt": ctx.bridge._now_iso(),
    }


def _pywebview_version() -> str:
    try:
        return version("pywebview")
    except PackageNotFoundError:
        return "unknown"


def _info(_params: dict[str, Any], ctx: RequestContext) -> dict[str, Any]:
    return {
        "platform": platform_module.platform(),
        "python": sys.version.split()[0],
        "pywebview": _pywebview_version(),
        "arch": platform_module.machine(),
        "pid": os.getpid(),
        "configDir": str(CONFIG_DIR),
        "distDir": str(FRONTEND_DIST),
        "distReady": (FRONTEND_DIST / "index.html").exists(),
        "startedAt": ctx.bridge._now_iso(),
    }


def _echo(params: dict[str, Any], _ctx: RequestContext) -> dict[str, Any]:
    text = params.get("text")
    if not isinstance(text, str):
        raise CommandError("E_INVALID_PARAMS", "text 必须是字符串")

    delay_ms = params.get("delayMs", 0)
    if isinstance(delay_ms, bool) or not isinstance(delay_ms, int) or delay_ms < 0:
        raise CommandError("E_INVALID_PARAMS", "delayMs 必须是非负整数")
    delay_ms = min(delay_ms, 2000)

    if delay_ms:
        import time

        time.sleep(delay_ms / 1000)

    return {"text": text, "delayMs": delay_ms}
