import re
from django.core.exceptions import ValidationError


# ─────────────────────────────────────────────────────────────────────────────
# Patterns
# ─────────────────────────────────────────────────────────────────────────────

EMAIL_REGEX = re.compile(r'^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$')

# E.164 format: optional + followed by 7–15 digits
PHONE_REGEX = re.compile(r'^\+?[1-9]\d{6,14}$')


# ─────────────────────────────────────────────────────────────────────────────
# Validators (usable as Django field validators or standalone callables)
# ─────────────────────────────────────────────────────────────────────────────

def validate_phone_number(value: str) -> None:
    """Raise ValidationError if value is not a valid phone number."""
    if not PHONE_REGEX.match(value):
        raise ValidationError(
            'Enter a valid phone number. Expected format: +2348012345678'
        )


def validate_email_format(value: str) -> None:
    """Raise ValidationError if value is not a valid email address."""
    if not EMAIL_REGEX.match(value):
        raise ValidationError('Enter a valid email address.')


def is_email(value: str) -> bool:
    return bool(EMAIL_REGEX.match(value))


def is_phone(value: str) -> bool:
    return bool(PHONE_REGEX.match(value))
