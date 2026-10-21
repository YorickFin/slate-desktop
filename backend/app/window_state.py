"""窗口几何与最大化状态持久化 [#A.030][#A.031]

规则：
- 只保存 normal 状态的几何；最大化/最小化只记录 ``state``。
- ``moved`` / ``resized`` 去抖 400ms 后落盘，并推送一次 ``window.state``。
- 文件缺失或损坏不阻塞启动：损坏文件重命名为 ``.bak`` 后使用默认值。
"""
from __future__ import annotations

import json
import logging
import os
import threading
from typing import Any

from .config import write_json_atomic
from .paths import RUNTIME_DIR

logger = logging.getLogger("slate.window_state")

STATE_PATH = RUNTIME_DIR / "window-state.json"
STATE_VERSION = 1
VALID_STATES = ("normal", "maximized")
DEBOUNCE_SECONDS = 0.4


def _window_cfg(config: dict[str, Any]) -> dict[str, Any]:
    window = config.get("window")
    return window if isinstance(window, dict) else {}


def _coerce_int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def default_state(config: dict[str, Any]) -> dict[str, Any]:
    window = _window_cfg(config)
    return {
        "version": STATE_VERSION,
        "state": "normal",
        "bounds": {
            "x": 120,
            "y": 90,
            "width": int(window.get("width", 1180)),
            "height": int(window.get("height", 780)),
        },
    }


def _min_size(config: dict[str, Any]) -> tuple[int, int]:
    window = _window_cfg(config)
    return int(window.get("minWidth", 960)), int(window.get("minHeight", 620))


def parse_state(raw: Any, config: dict[str, Any]) -> dict[str, Any] | None:
    """结构校验 + 尺寸夹紧；结构非法返回 None。"""
    if not isinstance(raw, dict):
        return None
    if raw.get("version") != STATE_VERSION:
        return None

    state = raw.get("state")
    if state not in VALID_STATES:
        return None

    bounds = raw.get("bounds")
    if not isinstance(bounds, dict):
        return None

    values: dict[str, int] = {}
    for key in ("x", "y", "width", "height"):
        parsed = _coerce_int(bounds.get(key))
        if parsed is None:
            return None
        values[key] = parsed

    min_width, min_height = _min_size(config)
    values["width"] = max(min_width, values["width"])
    values["height"] = max(min_height, values["height"])

    return {"version": STATE_VERSION, "state": state, "bounds": values}


def _quarantine(path: Any, reason: str) -> None:
    backup = path.with_suffix(path.suffix + ".bak")
    try:
        os.replace(path, backup)
        logger.warning("窗口状态文件无效（%s），已备份到 %s", reason, backup)
    except OSError:
        logger.warning("窗口状态文件无效（%s），备份失败", reason, exc_info=True)


def load_state(config: dict[str, Any]) -> dict[str, Any]:
    path = STATE_PATH
    if not path.exists():
        return default_state(config)

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        _quarantine(path, str(exc))
        return default_state(config)

    parsed = parse_state(raw, config)
    if parsed is None:
        _quarantine(path, "结构非法")
        return default_state(config)
    return parsed


# ---------------------------------------------------------------------- 屏幕约束
def _rect_from_frame(frame: Any) -> dict[str, int] | None:
    try:
        return {
            "x": int(frame.X),
            "y": int(frame.Y),
            "width": int(frame.Width),
            "height": int(frame.Height),
        }
    except (AttributeError, TypeError, ValueError):
        return None


def _rect_from_screen(screen: Any) -> dict[str, int] | None:
    try:
        return {
            "x": int(screen.x),
            "y": int(screen.y),
            "width": int(screen.width),
            "height": int(screen.height),
        }
    except (AttributeError, TypeError, ValueError):
        return None


def screen_work_areas() -> list[dict[str, int]]:
    """读取所有屏幕工作区；失败返回空列表（不做位置约束）。"""
    try:
        import webview

        screens = list(getattr(webview, "screens"))
    except Exception:  # noqa: BLE001 - 屏幕信息只用于兜底，失败不影响启动
        logger.debug("读取屏幕列表失败", exc_info=True)
        return []

    areas: list[dict[str, int]] = []
    for screen in screens:
        rect = _rect_from_frame(getattr(screen, "frame", None))
        if rect is None:
            rect = _rect_from_screen(screen)
        if rect is not None:
            areas.append(rect)
    return areas


def _intersects(bounds: dict[str, int], area: dict[str, int]) -> bool:
    return (
        bounds["x"] < area["x"] + area["width"]
        and bounds["x"] + bounds["width"] > area["x"]
        and bounds["y"] < area["y"] + area["height"]
        and bounds["y"] + bounds["height"] > area["y"]
    )


def _primary_area(areas: list[dict[str, int]]) -> dict[str, int]:
    """主屏 = 包含坐标原点的屏幕；找不到时退回列表首项。"""
    for area in areas:
        if (
            area["x"] <= 0 < area["x"] + area["width"]
            and area["y"] <= 0 < area["y"] + area["height"]
        ):
            return area
    return areas[0]


def resolve_startup_bounds(
    config: dict[str, Any], saved: dict[str, Any]
) -> tuple[dict[str, int], bool]:
    """返回启动几何与最大化标记；完全落在屏幕外时居中到主屏。"""
    bounds = dict(saved["bounds"])
    maximized = saved["state"] == "maximized"

    areas = screen_work_areas()
    if areas and not any(_intersects(bounds, area) for area in areas):
        primary = _primary_area(areas)
        bounds["x"] = primary["x"] + max(0, (primary["width"] - bounds["width"]) // 2)
        bounds["y"] = primary["y"] + max(0, (primary["height"] - bounds["height"]) // 2)
        logger.info("窗口完全在屏幕外，已居中到主屏：%s", bounds)

    return bounds, maximized


# ---------------------------------------------------------------------- 状态管理
class WindowStateManager:
    """把窗口事件与状态文件、window.state 事件串起来。"""

    def __init__(self, config: dict[str, Any], bridge: Any) -> None:
        self._config = config
        self._bridge = bridge
        self._remember = bool(_window_cfg(config).get("rememberState", True))
        self._state = "normal"
        self._normal_bounds: dict[str, int] = default_state(config)["bounds"]
        self._pending_bounds: dict[str, int] = {}
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()
        self._closing = False
        self._window: Any | None = None

    # ---------------------------------------------------------------- 启动恢复
    def restore(self) -> tuple[dict[str, int], bool]:
        saved = load_state(self._config) if self._remember else default_state(self._config)
        bounds, maximized = resolve_startup_bounds(self._config, saved)

        self._normal_bounds = dict(bounds)
        self._state = "maximized" if maximized else "normal"
        self._bridge._set_maximized(maximized)
        logger.info("窗口状态恢复：state=%s bounds=%s", self._state, bounds)
        return bounds, maximized

    # ---------------------------------------------------------------- 事件绑定
    def bind(self, window: Any) -> None:
        self._window = window
        window.events.moved += self._on_moved
        window.events.resized += self._on_resized
        window.events.maximized += self._on_maximized
        window.events.restored += self._on_restored
        window.events.closing += self._on_closing
        window.events.closed += self._on_closed

    def _on_moved(self, x: int, y: int) -> None:
        if self._state == "maximized":
            return
        # 最大化/还原时 Windows 会先派发 move/resize 再派发 maximized/restored，
        # 因此这里只记待定值，去抖落盘时再按最终状态决定是否采用。
        self._pending_bounds["x"] = int(x)
        self._pending_bounds["y"] = int(y)
        self._schedule()

    def _on_resized(self, width: int, height: int) -> None:
        if self._state == "maximized":
            return
        self._pending_bounds["width"] = int(width)
        self._pending_bounds["height"] = int(height)
        self._schedule()

    def _on_maximized(self) -> None:
        if self._state == "maximized":
            return
        self._state = "maximized"
        self._pending_bounds.clear()
        self._cancel_timer()
        self._bridge._notify_window_state("maximized")
        self._write()

    def _on_restored(self) -> None:
        if self._state == "normal":
            return
        self._state = "normal"
        self._pending_bounds.clear()
        self._cancel_timer()
        self._bridge._notify_window_state("normal")
        self._write()

    def _on_closing(self) -> None:
        self._closing = True
        self._cancel_timer()
        self._write()

    def _on_closed(self) -> None:
        self._closing = True
        self._cancel_timer()
        self._write()

    # ---------------------------------------------------------------- 去抖与落盘
    def _schedule(self) -> None:
        with self._lock:
            if self._closing:
                return
            if self._timer is not None:
                self._timer.cancel()
            self._timer = threading.Timer(DEBOUNCE_SECONDS, self._flush)
            self._timer.daemon = True
            self._timer.start()

    def _cancel_timer(self) -> None:
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None

    def _flush(self) -> None:
        with self._lock:
            self._timer = None
            pending = dict(self._pending_bounds)
            self._pending_bounds.clear()

        if self._state != "maximized" and pending:
            self._normal_bounds.update(pending)

        self._write()
        if not self._closing:
            self._bridge._emit("window.state", self._bridge._window_snapshot())

    def _payload(self) -> dict[str, Any]:
        return {
            "version": STATE_VERSION,
            "state": self._state,
            "bounds": dict(self._normal_bounds),
        }

    def _write(self) -> None:
        try:
            write_json_atomic(STATE_PATH, self._payload())
        except Exception:  # noqa: BLE001 - 持久化失败只记录，不影响窗口操作
            logger.warning("保存窗口状态失败", exc_info=True)
