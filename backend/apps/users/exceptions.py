from rest_framework.exceptions import ErrorDetail, ValidationError


def field_error(field: str, message: str, code: str) -> ValidationError:
    return ValidationError({field: ErrorDetail(message, code=code)})


def detail_error(message: str, code: str) -> ValidationError:
    return ValidationError({'detail': ErrorDetail(message, code=code)})
