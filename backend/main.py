"""Slate 桌面应用入口：pywebview 壳 + 唯一 Bridge。"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any

# 支持 `python backend/main.py` 直接运行：把 backend 目录加入模块搜索路径
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import webview

from app.bridge import Bridge
from app.commands import register_all
from app.config import load_app_config
from app.paths import FRONTEND_DIST
from app.window_state import WindowStateManager

logger = logging.getLogger("slate")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Slate 桌面应用")
    parser.add_argument("--dev", action="store_true", help="加载 Vite 开发服务器")
    parser.add_argument("--debug", action="store_true", help="开启 pywebview 调试与 DevTools")
    return parser.parse_args()


def resolve_url(config: dict[str, Any], dev: bool) -> tuple[str, bool]:
    if dev:
        return str(config["dev"]["url"]), False

    index = FRONTEND_DIST / "index.html"
    if not index.exists():
        raise SystemExit(f"未找到前端构建产物：{index}\n请先在 frontend 目录执行 pnpm build")
    return str(index), True


def main() -> None:
    args = parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
        force=True,
    )

    config = load_app_config()
    url, use_http_server = resolve_url(config, args.dev)

    bridge = Bridge(config)
    register_all(bridge)

    window_cfg = config["window"]
    state_manager = WindowStateManager(config, bridge)
    bounds, maximized = state_manager.restore()

    window = webview.create_window(
        title=str(config["app"]["title"]),
        url=url,
        js_api=bridge,
        x=bounds["x"],
        y=bounds["y"],
        width=bounds["width"],
        height=bounds["height"],
        min_size=(int(window_cfg["minWidth"]), int(window_cfg["minHeight"])),
        frameless=bool(window_cfg["frameless"]),
        easy_drag=False,
        background_color=str(window_cfg["background"]),
        text_select=False,
        zoomable=False,
        confirm_close=False,
    )
    bridge._attach(window)
    state_manager.bind(window)

    if maximized:
        # frameless 窗口在 create_window 阶段直接最大化会得到错误的几何，
        # 改为窗口显示后再最大化，保证最大化铺满工作区。
        def restore_maximized() -> None:
            window.maximize()

        window.events.shown += restore_maximized

    def on_closed() -> None:
        bridge._shutdown()

    window.events.closed += on_closed

    logger.info("启动 Slate：%s", url)
    webview.start(
        debug=args.debug or bool(config["dev"]["debug"]),
        http_server=use_http_server,
    )


if __name__ == "__main__":
    main()
