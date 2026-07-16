from django.db import models


class AccountStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'Pending Verification'
    RESTRICTED = 'RESTRICTED', 'Restricted'
    SUSPENDED = 'SUSPENDED', 'Suspended'
    DELETED = 'DELETED', 'Deleted'


class VerificationPurpose(models.TextChoices):
    REGISTER = 'REGISTER', 'Register'
    LOGIN = 'LOGIN', 'Login'
    EMAIL_VERIFICATION = 'EMAIL_VERIFICATION', 'Email Verification'
    PHONE_VERIFICATION = 'PHONE_VERIFICATION', 'Phone Verification'
    PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
