from typing import List

from app.core.errors.types import APIValidationError, FieldValidationError

_REQUIRED_KEYS = ("field", "type", "message")


def field_validation_error(*, field: str, error_type: str, message: str) -> FieldValidationError:
    return {
        "field": field,
        "type": error_type,
        "message": message,
    }


def _validate_field_errors(errors: List[FieldValidationError]) -> None:
    if not errors:
        raise ValueError("At least one field validation error is required.")

    for index, error in enumerate(errors):
        missing = [key for key in _REQUIRED_KEYS if not error.get(key)]
        if missing:
            raise ValueError(
                f"Field validation error at index {index} is missing: {', '.join(missing)}"
            )


class FieldValidationException(Exception):
    def __init__(
        self,
        errors: List[FieldValidationError] | None = None,
        *,
        field: str | None = None,
        error_type: str | None = None,
        message: str | None = None,
    ) -> None:
        if errors is not None:
            parsed_errors = errors
        elif field is not None and error_type is not None and message is not None:
            parsed_errors = [field_validation_error(field=field, error_type=error_type, message=message)]
        else:
            raise ValueError("Provide either `errors` or `field`, `error_type`, and `message`.")

        _validate_field_errors(parsed_errors)
        self.errors = parsed_errors
        super().__init__(parsed_errors[0]["message"])

    def to_response(self) -> APIValidationError:
        return {"detail": self.errors}
