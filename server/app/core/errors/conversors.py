from typing import List, Sequence
from fastapi import HTTPException
from starlette import status

from app.core.errors.types import FieldValidationError


async def convert_default_validation_error_message(message: Sequence) -> List[FieldValidationError]:
    errors: List[FieldValidationError] = []
    try:
        for item in message:
            error_type = item['type']

            if item['loc'][0] == "body" and len(item['loc']) > 1:
                field_name = ".".join(str(item['loc'][i]) for i in range(1, len(item['loc'])))
            else:
                field_name = ".".join(str(item['loc'][i]) for i in range(len(item['loc'])))

            # error_message = f"{item['loc'][-1]}: {item['msg']}"
            error_message = f"{item['msg']}"

            errors.append({
                "field": field_name,
                "type": error_type,
                "message": error_message,
            })

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e.__str__())

    return errors


async def convert_sql_alchemy_params(args: tuple) -> List[FieldValidationError]:
    errors: List[FieldValidationError] = []
    try:
        for value in args:
            error = value.split('DETAIL:')
            error_type = error[0].split(' ')[0]
            if error_type == '(psycopg2.errors.NotNullViolation)':
                error_type = 'not_null_violation'
                message = error[0].replace("(psycopg2.errors.NotNullViolation)", "")
                key = error[0].split('"')[1]
            else:
                message = error[1]
                message = message.split('=')
                key = message[0].replace('Key', '').replace('(', '').replace(')', '').strip()
                message = message[1]

            errors.append(
                {
                    "field": key,
                    "type": error_type,
                    "message": message,
                }
            )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e.__str__())

    return errors
