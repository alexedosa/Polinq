from django.conf import settings


# OTP Settings
OTP_EXPIRY_MINUTES: int = int(getattr(settings, 'OTP_EXPIRY_MINUTES', 10))
OTP_MAX_ATTEMPTS: int = int(getattr(settings, 'OTP_MAX_ATTEMPTS', 5))
OTP_MAX_RESENDS: int = int(getattr(settings, 'OTP_MAX_RESENDS', 3))
OTP_RESEND_COOLDOWN_SECONDS: int = int(getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 60))

# Login Lock Settings
FAILED_LOGIN_MAX_ATTEMPTS: int = int(getattr(settings, 'FAILED_LOGIN_MAX_ATTEMPTS', 7))
ACCOUNT_LOCK_DURATION_MINUTES: int = int(getattr(settings, 'ACCOUNT_LOCK_DURATION_MINUTES', 30))
