"""项目路径解析：所有配置与运行时文件固定在项目 config 目录下。"""
from __future__ import annotations

from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

CONFIG_DIR = ROOT_DIR / "config"
RUNTIME_DIR = CONFIG_DIR / "runtime"
FRONTEND_DIR = ROOT_DIR / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
