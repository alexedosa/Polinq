"""
Authentication serializers for Linkora.

Rules:
  - Validate data. Serialize responses.
  - No business logic here.
  - All cross-field validation (e.g. password confirmation) lives in validate().
"""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.users.choices import VerificationPurpose
from apps.users.models import User
from core.validators import validate_email_format, validate_phone_number


# ─────────────────────────────────────────────────────────────────────────────
# Registration
# ─────────────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True, default=None)
    phone_number = serializers.CharField(required=False, allow_blank=True, default=None)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value: str) -> str | None:
        if not value:
            return None
        validate_email_format(value)
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_phone_number(self, value: str) -> str | None:
        if not value:
            return None
        validate_phone_number(value)
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('An account with this phone number already exists.')
        return value

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, data: dict) -> dict:
        if not data.get('email') and not data.get('phone_number'):
            raise serializers.ValidationError(
                'Provide at least one of email or phone number.'
            )
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data


# ─────────────────────────────────────────────────────────────────────────────
# OTP Verification
# ─────────────────────────────────────────────────────────────────────────────

class OTPVerifySerializer(serializers.Serializer):
    identifier = serializers.CharField(
        help_text='Email or phone number used during registration.'
    )
    purpose = serializers.ChoiceField(choices=VerificationPurpose.choices)
    code = serializers.CharField(max_length=6, min_length=6)


class OTPResendSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    purpose = serializers.ChoiceField(choices=VerificationPurpose.choices)


# ─────────────────────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        help_text='Your email address or phone number.'
    )
    password = serializers.CharField(write_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────────────────────────────────────

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        help_text='The refresh token to invalidate.'
    )


# ─────────────────────────────────────────────────────────────────────────────
# Token Refresh
# ─────────────────────────────────────────────────────────────────────────────

class TokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


# ─────────────────────────────────────────────────────────────────────────────
# Password Management
# ─────────────────────────────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        help_text='Your email address or phone number.'
    )


class VerifyResetCodeSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    code = serializers.CharField(max_length=6, min_length=6)


class ResetPasswordSerializer(serializers.Serializer):
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


# ─────────────────────────────────────────────────────────────────────────────
# Response Serializers
# ─────────────────────────────────────────────────────────────────────────────

class AuthUserSerializer(serializers.ModelSerializer):
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'full_name',
            'email',
            'phone_number',
            'is_verified',
            'account_status',
        ]
        read_only_fields = fields


class TokenResponseSerializer(serializers.Serializer):
    """Standard token pair response."""
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = AuthUserSerializer(read_only=True)


class MessageResponseSerializer(serializers.Serializer):
    """Generic message-only response."""
    detail = serializers.CharField(read_only=True)
