"""
唯一 js_api 桥接对象 [#A.001]-[#A.007]

pywebview 会把 js_api 上所有公开方法暴露给前端，因此 Bridge 只允许一个公开方法 rpc()。
其余成员全部以下划线开头，前端无法直接调用。
"""
from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable

from .config import load_app_config
from .errors import CommandError

logger = logging.getLogger("slate.bridge")

PROTOCOL_VERSION = 1
MIN_TIMEOUT_MS = 500
MAX_TIMEOUT_MS = 60_000
TICK_INTERVAL_S = 2.0
EVENT_SINK = "window.__SLATE_EVENTS__ && window.__SLATE_EVENTS__.receive"

Handler = Callable[[dict[str, Any], "RequestContext"], Any]


@dataclass(slots=True)
class RequestContext:
    request_id: str
    cmd: str
    timeout_ms: int
    config: dict[str, Any]
    window: Any | None
    bridge: "Bridge"


@dataclass(slots=True)
class _ParsedRequest:
    request_id: str
    cmd: str
    params: dict[str, Any]
    timeout_ms: int


class Bridge:
    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self._config = config or load_app_config()
        self._commands: dict[str, Handler] = {}
        self._window: Any | None = None
        self._seq = 0
        self._seq_lock = threading.Lock()
        self._started_wall = time.time()
        self._started_mono = time.monotonic()
        self._maximized = False
        self._shutdown_event = threading.Event()
        self._ticker_started = False
        self._ticker_lock = threading.Lock()
        self._max_envelope_bytes = int(self._config["bridge"]["maxEnvelopeBytes"])
        self._default_timeout_ms = int(self._config["bridge"]["timeoutMs"])

    # ------------------------------------------------------------------ 公开入口
    def rpc(self, envelope: str) -> str:
        """前端唯一入口：接收 JSON 信封字符串，永远返回 JSON 响应字符串。"""
        started = time.perf_counter()
        request_id = ""
        try:
            request = self._parse(envelope)
            request_id = request.request_id

            handler = self._commands.get(request.cmd)
            if handler is None:
                raise CommandError("E_UNKNOWN_CMD", f"未知命令：{request.cmd}")

            context = RequestContext(
                request_id=request.request_id,
                cmd=request.cmd,
                timeout_ms=request.timeout_ms,
                config=self._config,
                window=self._window,
                bridge=self,
            )
            result = handler(request.params, context)
            return self._response_ok(request.request_id, result, started)
        except CommandError as exc:
            return self._response_error(request_id, exc.code, exc.message, exc.details, started)
        except Exception as exc:  # noqa: BLE001 - 边界处必须兜底，避免异常穿透 js_api
            logger.exception("命令执行失败")
            return self._response_error(
                request_id,
                "E_INTERNAL",
                "后端内部错误",
                {"type": type(exc).__name__},
                started,
            )

    # ------------------------------------------------------------------ 内部注册
    def _register(self, name: str, handler: Handler) -> None:
        if not name:
            raise ValueError("命令名不能为空")
        if name in self._commands:
            raise ValueError(f"命令重复注册：{name}")
        self._commands[name] = handler

    def _attach(self, window: Any) -> None:
        self._window = window

    def _now_iso(self) -> str:
        return time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime(self._started_wall))

    def _uptime_ms(self) -> int:
        return int((time.monotonic() - self._started_mono) * 1000)

    def _bounds(self) -> dict[str, int]:
        window = self._window
        if window is None:
            return {"x": 0, "y": 0, "width": 0, "height": 0}
        try:
            return {
                "x": int(window.x),
                "y": int(window.y),
                "width": int(window.width),
                "height": int(window.height),
            }
        except Exception:  # noqa: BLE001 - 窗口销毁阶段取几何值可能失败
            logger.debug("读取窗口几何失败", exc_info=True)
            return {"x": 0, "y": 0, "width": 0, "height": 0}

    def _window_snapshot(self) -> dict[str, Any]:
        return {
            "state": "maximized" if self._maximized else "normal",
            "bounds": self._bounds(),
        }

    def _notify_window_state(self, state: str) -> None:
        self._maximized = state == "maximized"
        self._emit("window.state", self._window_snapshot())

    def _set_maximized(self, maximized: bool) -> None:
        """启动恢复时同步最大化标记，不触发事件。"""
        self._maximized = bool(maximized)

    def _emit(self, event: str, data: Any) -> None:
        window = self._window
        if window is None or self._shutdown_event.is_set():
            return

        with self._seq_lock:
            self._seq += 1
            seq = self._seq

        payload = {
            "v": PROTOCOL_VERSION,
            "type": "event",
            "event": event,
            "seq": seq,
            "ts": int(time.time() * 1000),
            "data": data,
        }
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)
        script = f"{EVENT_SINK}({json.dumps(raw, ensure_ascii=False)});"
        try:
            window.evaluate_js(script)
        except Exception:  # noqa: BLE001 - 页面刷新/关闭期间推送失败不应影响主流程
            logger.debug("事件推送失败：%s", event, exc_info=True)

    def _start_ticker(self) -> None:
        with self._ticker_lock:
            if self._ticker_started:
                return
            self._ticker_started = True

        def loop() -> None:
            seq = 0
            while not self._shutdown_event.wait(TICK_INTERVAL_S):
                seq += 1
                self._emit("system.tick", {"seq": seq, "uptimeMs": self._uptime_ms()})

        threading.Thread(target=loop, name="slate-ticker", daemon=True).start()

    def _shutdown(self) -> None:
        self._shutdown_event.set()

    # ------------------------------------------------------------------ 协议解析
    def _parse(self, envelope: Any) -> _ParsedRequest:
        if not isinstance(envelope, str):
            raise CommandError("E_BAD_ENVELOPE", "请求必须是 JSON 字符串")

        if len(envelope.encode("utf-8")) > self._max_envelope_bytes:
            raise CommandError(
                "E_BAD_ENVELOPE",
                "请求体超出上限",
                {"limitBytes": self._max_envelope_bytes},
            )

        try:
            data = json.loads(envelope)
        except json.JSONDecodeError as exc:
            raise CommandError("E_BAD_ENVELOPE", "请求不是合法 JSON", {"reason": exc.msg}) from exc

        if not isinstance(data, dict):
            raise CommandError("E_BAD_ENVELOPE", "请求根节点必须是对象")
        if data.get("v") != PROTOCOL_VERSION:
            raise CommandError(
                "E_BAD_ENVELOPE",
                "协议版本不匹配",
                {"expected": PROTOCOL_VERSION, "actual": data.get("v")},
            )

        request_id = data.get("id")
        if not isinstance(request_id, str) or not 1 <= len(request_id) <= 128:
            raise CommandError("E_BAD_ENVELOPE", "id 必须为 1-128 字符字符串")

        cmd = data.get("cmd")
        if not isinstance(cmd, str) or not cmd:
            raise CommandError("E_BAD_ENVELOPE", "cmd 必须为非空字符串")

        params = data.get("params", {})
        if params is None:
            params = {}
        if not isinstance(params, dict):
            raise CommandError("E_INVALID_PARAMS", "params 必须是对象")

        timeout_ms = data.get("timeoutMs", self._default_timeout_ms)
        if isinstance(timeout_ms, bool) or not isinstance(timeout_ms, int):
            raise CommandError("E_INVALID_PARAMS", "timeoutMs 必须是整数")
        timeout_ms = max(MIN_TIMEOUT_MS, min(timeout_ms, MAX_TIMEOUT_MS))

        return _ParsedRequest(
            request_id=request_id,
            cmd=cmd,
            params=params,
            timeout_ms=timeout_ms,
        )

    # ------------------------------------------------------------------ 响应编码
    def _response_ok(self, request_id: str, result: Any, started: float) -> str:
        payload = {
            "v": PROTOCOL_VERSION,
            "id": request_id,
            "ok": True,
            "result": result,
            "meta": {
                "durationMs": round((time.perf_counter() - started) * 1000, 2),
                "ts": int(time.time() * 1000),
            },
        }
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)

    def _response_error(
        self,
        request_id: str,
        code: str,
        message: str,
        details: Any,
        started: float,
    ) -> str:
        error: dict[str, Any] = {"code": code, "message": message}
        if details is not None:
            error["details"] = details
        payload = {
            "v": PROTOCOL_VERSION,
            "id": request_id,
            "ok": False,
            "error": error,
            "meta": {
                "durationMs": round((time.perf_counter() - started) * 1000, 2),
                "ts": int(time.time() * 1000),
            },
        }
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)
