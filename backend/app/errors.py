"""后端命令错误：统一映射为响应信封中的 error 字段。"""
from __future__ import annotations

from typing import Any


class CommandError(Exception):
    def __init__(self, code: str, message: str, details: Any | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
