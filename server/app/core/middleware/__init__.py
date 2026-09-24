from fastapi import FastAPI

from app.core.logs import get_logger
from app.core.middleware.cors import configure_cross_origin_resource_sharing


def configure_middleware(app: FastAPI):
    logger = get_logger()
    logger.info(f'Configuring Middlewares.')
    configure_cross_origin_resource_sharing(app)