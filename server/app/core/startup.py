import os
from typing import NoReturn

from app.core.logs import get_logger


def _root_error_message(error: Exception) -> str:
    root = error
    while root.__cause__:
        root = root.__cause__
    return str(root).strip().split('\n')[0]


def format_connection_error(service: str, error: Exception) -> str:
    detail = _root_error_message(error)
    if service == 'database':
        return (
            'Could not connect to database. Is the server running on that host '
            f'and accepting TCP/IP connections? {detail}'
        )
    return f'Could not connect to {service}. {detail}'


def format_startup_error(error: Exception) -> str:
    return f'Application startup failed: {_root_error_message(error)}'


def abort_startup(message: str) -> NoReturn:
    get_logger().error(message)
    os._exit(1)
