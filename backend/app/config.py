"""配置加载与运行时状态读写。"""
from __future__ import annotations

import json
import logging
import os
import tempfile
from copy import deepcopy
from pathlib import Path
from typing import Any

from .paths import CONFIG_DIR, RUNTIME_DIR

logger = logging.getLogger("slate.config")

DEFAULT_CONFIG: dict[str, Any] = {
    "app": {"name": "Slate", "title": "Slate 工作台"},
    "window": {
        "width": 1180,
        "height": 780,
        "minWidth": 960,
        "minHeight": 620,
        "frameless": True,
        "background": "#F7F7F5",
        "rememberState": True,
    },
    "ui": {"theme": "system", "density": "comfortable"},
    "bridge": {"timeoutMs": 8000, "maxEnvelopeBytes": 1048576},
    "dev": {"url": "http://127.0.0.1:5173", "debug": False},
}

VALID_THEMES = {"light", "dark", "system"}
VALID_DENSITIES = {"comfortable", "compact"}


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def read_json(path: Path, fallback: Any) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return deepcopy(fallback)
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("读取 JSON 失败，使用默认值：%s（%s）", path, exc)
        return deepcopy(fallback)


def write_json_atomic(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_name = tempfile.mkstemp(
        dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp"
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except OSError:
            pass
        raise


def load_app_config() -> dict[str, Any]:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    raw = read_json(CONFIG_DIR / "app.config.json", {})
    if not isinstance(raw, dict):
        logger.warning("app.config.json 根节点必须是对象，已忽略")
        raw = {}
    return _deep_merge(DEFAULT_CONFIG, raw)


def normalize_ui_state(raw: Any, defaults: dict[str, Any]) -> dict[str, str]:
    source = raw if isinstance(raw, dict) else {}
    theme = source.get("theme", defaults.get("theme", "system"))
    density = source.get("density", defaults.get("density", "comfortable"))
    return {
        "theme": theme if theme in VALID_THEMES else "system",
        "density": density if density in VALID_DENSITIES else "comfortable",
    }


def load_ui_state(config: dict[str, Any]) -> dict[str, str]:
    raw = read_json(RUNTIME_DIR / "ui-state.json", {})
    return normalize_ui_state(raw, config.get("ui", {}))


def save_ui_state(state: dict[str, str]) -> None:
    write_json_atomic(RUNTIME_DIR / "ui-state.json", state)
