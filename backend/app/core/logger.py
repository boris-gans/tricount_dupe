import logging
from logging import Logger
from typing import Optional
from fastapi import Request

from app.core.config import settings


def setup_logging(level: int = logging.INFO) -> Logger:
    logger = logging.getLogger(settings.base_logger_name)
    if logger.handlers:
        return logger

    logger.setLevel(level)
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(level)
    stream_handler.setFormatter(logging.Formatter(settings.log_format))
    logger.addHandler(stream_handler)
    logger.propagate = False

    return logger


def get_request_logger(request: Request, name: Optional[str] = None) -> Logger:
    base_logger: Logger = request.app.state.logger
    if name:
        return base_logger.getChild(name)

    endpoint = request.scope.get("endpoint")
    if endpoint:
        return base_logger.getChild(endpoint.__qualname__)

    return base_logger.getChild(request.scope.get("path", "unknown"))


def get_module_logger(name: str) -> Logger:
    base_logger = logging.getLogger(settings.base_logger_name)

    return base_logger.getChild(name)