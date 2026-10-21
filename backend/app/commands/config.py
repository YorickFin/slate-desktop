"""config.* 命令：读取与持久化 UI 运行时配置。"""
from __future__ import annotations

from typing import Any

from ..bridge import Bridge, RequestContext
from ..config import load_ui_state, normalize_ui_state, save_ui_state
from ..errors import CommandError

ALLOWED_KEYS = {"theme", "density"}


def register(bridge: Bridge) -> None:
    bridge._register("config.get", _get)
    bridge._register("config.patchUi", _patch_ui)


def _get(_params: dict[str, Any], ctx: RequestContext) -> dict[str, Any]:
    return {
        "ui": load_ui_state(ctx.config),
        "window": ctx.bridge._window_snapshot(),
    }


def _patch_ui(params: dict[str, Any], ctx: RequestContext) -> dict[str, str]:
    unknown = set(params) - ALLOWED_KEYS
    if unknown:
        raise CommandError("E_INVALID_PARAMS", "包含未知配置项", {"keys": sorted(unknown)})

    for key, value in params.items():
        if not isinstance(value, str):
            raise CommandError("E_INVALID_PARAMS", f"{key} 必须是字符串")

    current = load_ui_state(ctx.config)
    merged = normalize_ui_state({**current, **params}, ctx.config.get("ui", {}))
    save_ui_state(merged)
    ctx.bridge._emit("config.changed", {"ui": merged})
    return merged
