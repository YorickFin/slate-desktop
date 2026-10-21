"""window.* 命令：窗口控制与几何查询。"""
from __future__ import annotations

from typing import Any

from ..bridge import Bridge, RequestContext
from ..errors import CommandError


def register(bridge: Bridge) -> None:
    bridge._register("window.minimize", _minimize)
    bridge._register("window.toggleMaximize", _toggle_maximize)
    bridge._register("window.close", _close)
    bridge._register("window.state", _state)


def _window_or_error(ctx: RequestContext) -> Any:
    if ctx.window is None:
        raise CommandError("E_UNAVAILABLE", "窗口尚未创建")
    return ctx.window


def _minimize(_params: dict[str, Any], ctx: RequestContext) -> dict[str, Any]:
    window = _window_or_error(ctx)
    window.minimize()
    return {"state": "maximized" if ctx.bridge._maximized else "normal"}


def _toggle_maximize(_params: dict[str, Any], ctx: RequestContext) -> dict[str, Any]:
    window = _window_or_error(ctx)
    target = not ctx.bridge._maximized
    ctx.bridge._maximized = target

    if target:
        window.maximize()
    else:
        window.restore()

    snapshot = ctx.bridge._window_snapshot()
    ctx.bridge._emit("window.state", snapshot)
    return snapshot


def _close(_params: dict[str, Any], ctx: RequestContext) -> dict[str, Any]:
    window = _window_or_error(ctx)
    window.destroy()
    return {"closed": True}


def _state(_params: dict[str, Any], ctx: RequestContext) -> dict[str, Any]:
    _window_or_error(ctx)
    return ctx.bridge._window_snapshot()
