from typing import Sequence

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError, ValidationException
from sqlalchemy.exc import IntegrityError
from starlette import status
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.errors.conversors import convert_default_validation_error_message, convert_sql_alchemy_params
from app.core.errors.exceptions import FieldValidationException
from app.core.errors.types import APIValidationError
from app.core.i18n import get_request_locale, translate
from app.core.logs import get_logger

_PATH_UUID_ERROR_TYPES = frozenset({'uuid_parsing', 'uuid_type'})


def _is_path_uuid_validation_error(errors: Sequence[dict]) -> bool:
    if not errors:
        return False

    for item in errors:
        location = item.get('loc', ())
        if len(location) < 2 or location[0] != 'path':
            return False
        if item.get('type') not in _PATH_UUID_ERROR_TYPES:
            return False

    return True


async def validation_exception_handler(request: Request, exc: ValidationException | Exception) -> JSONResponse:
    errors = exc.errors()

    if _is_path_uuid_validation_error(errors):
        locale = get_request_locale(request)
        return JSONResponse(
            {'detail': translate('common.not_found', locale)},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    error: APIValidationError = {
        'detail': await convert_default_validation_error_message(errors),
    }

    return JSONResponse(error, status_code=status.HTTP_400_BAD_REQUEST)


async def field_validation_exception_handler(_: Request, exc: FieldValidationException) -> JSONResponse:
    return JSONResponse(exc.to_response(), status_code=status.HTTP_400_BAD_REQUEST)


async def sql_alchemy_integrity_error_handler(request: Request, exc: IntegrityError | Exception) -> JSONResponse:
    error = {
        'detail': await convert_sql_alchemy_params(exc.args),
    }

    return JSONResponse(error, status_code=status.HTTP_400_BAD_REQUEST)


def register_exception_handlers(app: FastAPI):
    logger = get_logger()
    logger.info(f'Registering Error Handlers.')
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(FieldValidationException, field_validation_exception_handler)
    app.add_exception_handler(IntegrityError, sql_alchemy_integrity_error_handler)