from rest_framework.views import exception_handler

from core.responses import error_response


CODE_MAP = {
    'authentication_failed': 'INVALID_CREDENTIALS',
    'not_authenticated': 'PERMISSION_DENIED',
    'permission_denied': 'PERMISSION_DENIED',
    'invalid': 'VALIDATION_ERROR',
    'required': 'VALIDATION_ERROR',
    'blank': 'VALIDATION_ERROR',
    'null': 'VALIDATION_ERROR',
    'does_not_exist': 'VALIDATION_ERROR',
    'token_not_valid': 'TOKEN_INVALID',
    'token_not_validated': 'TOKEN_INVALID',
    'throttled': 'THROTTLED',
}


def normalize_error_code(code: str | None, status_code: int) -> str:
    if not code:
        if status_code == 401:
            return 'TOKEN_INVALID'
        if status_code == 403:
            return 'PERMISSION_DENIED'
        return 'VALIDATION_ERROR'

    code = str(code)
    if code.isupper():
        return code
    return CODE_MAP.get(code, code.upper())


def _first_error_code(codes):
    if isinstance(codes, dict):
        for value in codes.values():
            found = _first_error_code(value)
            if found:
                return found
    elif isinstance(codes, list):
        for value in codes:
            found = _first_error_code(value)
            if found:
                return found
    elif codes:
        return str(codes)
    return None


def _stringify_errors(data):
    if isinstance(data, dict):
        return {key: _stringify_errors(value) for key, value in data.items()}
    if isinstance(data, list):
        return [_stringify_errors(value) for value in data]
    return str(data)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    status_code = response.status_code
    codes = exc.get_codes() if hasattr(exc, 'get_codes') else None
    code = normalize_error_code(_first_error_code(codes), status_code)

    if isinstance(data, dict) and 'detail' in data:
        message = str(data['detail'])
        errors = {}
    else:
        message = 'Validation failed.' if status_code == 400 else 'Request failed.'
        errors = _stringify_errors(data)

    lowered_message = message.lower()
    if code == 'TOKEN_INVALID' and 'expired' in lowered_message and 'invalid or expired' not in lowered_message:
        code = 'TOKEN_EXPIRED'

    response.data = {
        'success': False,
        'message': message,
        'code': code,
        'errors': errors,
    }
    return response
