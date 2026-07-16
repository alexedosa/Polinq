from rest_framework.response import Response


def success_response(message: str, data: dict | None = None, status_code: int = 200) -> Response:
    return Response(
        {
            'success': True,
            'message': message,
            'data': data or {},
        },
        status=status_code,
    )


def error_response(
    message: str,
    code: str,
    errors: dict | list | None = None,
    status_code: int = 400,
) -> Response:
    return Response(
        {
            'success': False,
            'message': message,
            'code': code,
            'errors': errors or {},
        },
        status=status_code,
    )
