from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ErrorDetail, PermissionDenied, ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken, UntypedToken

from apps.users.choices import AccountStatus, VerificationPurpose
from apps.users.constants import (
    ACCOUNT_LOCK_DURATION_MINUTES,
    FAILED_LOGIN_MAX_ATTEMPTS,
    OTP_EXPIRY_MINUTES,
    OTP_MAX_ATTEMPTS,
    OTP_MAX_RESENDS,
    OTP_RESEND_COOLDOWN_SECONDS,
)
from apps.users.exceptions import detail_error, field_error
from apps.users.models import User, VerificationCode
from apps.users.serializers import AuthUserSerializer


logger = logging.getLogger(__name__)


class VerificationProvider:
    def send(self, recipient: str, code: str) -> None:
        raise NotImplementedError(f'{self.__class__.__name__} must implement send()')


class SMSVerificationProvider(VerificationProvider):
    def send(self, recipient: str, code: str) -> None:
        if getattr(settings, 'ENABLE_DEVELOPMENT_OTP_OUTBOX', False):
            cache.set(f'dev-otp:sms:{recipient}', code, timeout=OTP_EXPIRY_MINUTES * 60)
            logger.info('Stored development SMS OTP for %s.', recipient)
            return
        logger.warning('SMS verification provider is not configured for %s.', recipient)


class EmailVerificationProvider(VerificationProvider):
    def send(self, recipient: str, code: str) -> None:
        if getattr(settings, 'ENABLE_DEVELOPMENT_OTP_OUTBOX', False):
            cache.set(f'dev-otp:email:{recipient}', code, timeout=OTP_EXPIRY_MINUTES * 60)
            logger.info('Stored development email OTP for %s.', recipient)
            return
        send_mail(
            subject='Your Polinq verification code',
            message=f'Your verification code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes.',
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[recipient],
            fail_silently=False,
        )


class VerificationService:
    def __init__(self) -> None:
        self._sms = SMSVerificationProvider()
        self._email = EmailVerificationProvider()

    def send(self, user: User, code: str) -> None:
        if getattr(settings, 'ENABLE_PHONE_VERIFICATION', False) and user.phone_number:
            self._sms.send(user.phone_number, code)
        if getattr(settings, 'ENABLE_EMAIL_VERIFICATION', False) and user.email:
            self._email.send(user.email, code)


class OTPService:
    def _generate_raw_code(self) -> str:
        return str(secrets.randbelow(900_000) + 100_000)

    def _hash(self, code: str) -> str:
        return make_password(code)

    def _check(self, raw_code: str, encoded: str) -> bool:
        return check_password(raw_code, encoded)

    def _invalidate_active(self, user: User, purpose: str) -> int:
        active = VerificationCode.objects.filter(
            user=user,
            purpose=purpose,
            used_at__isnull=True,
        )
        max_resend = (
            active.order_by('-resend_count').values_list('resend_count', flat=True).first()
            or 0
        )
        active.update(used_at=timezone.now())
        return max_resend

    def generate(self, user: User, purpose: str) -> str:
        with transaction.atomic():
            self._invalidate_active(user, purpose)
            raw = self._generate_raw_code()
            VerificationCode.objects.create(
                user=user,
                purpose=purpose,
                code=self._hash(raw),
                expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
            )
        return raw

    def verify(self, user: User, purpose: str, raw_code: str) -> VerificationCode:
        with transaction.atomic():
            record = (
                VerificationCode.objects
                .select_for_update()
                .filter(user=user, purpose=purpose, used_at__isnull=True)
                .order_by('-created_at')
                .first()
            )
            if not record:
                raise field_error('code', 'No active verification code found.', 'OTP_INVALID')
            if record.is_expired:
                raise field_error('code', 'This verification code has expired.', 'OTP_EXPIRED')
            if record.attempt_count >= OTP_MAX_ATTEMPTS:
                raise field_error(
                    'code',
                    'Maximum verification attempts exceeded. Please request a new code.',
                    'OTP_ATTEMPTS_EXCEEDED',
                )

            record.attempt_count += 1
            record.save(update_fields=['attempt_count'])

            if not self._check(raw_code, record.code):
                raise field_error('code', 'Invalid verification code.', 'OTP_INVALID')

            record.used_at = timezone.now()
            record.save(update_fields=['used_at'])
            return record

    def resend(self, user: User, purpose: str) -> str:
        with transaction.atomic():
            current_resend_count = self._invalidate_active(user, purpose)
            last = (
                VerificationCode.objects
                .select_for_update()
                .filter(user=user, purpose=purpose)
                .order_by('-created_at')
                .first()
            )
            if last:
                cooldown_ends_at = last.created_at + timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)
                if timezone.now() < cooldown_ends_at:
                    raise detail_error(
                        'Please wait before requesting another verification code.',
                        'OTP_RESEND_COOLDOWN',
                    )

            cumulative = max(current_resend_count, last.resend_count if last else 0)
            if cumulative >= OTP_MAX_RESENDS:
                raise detail_error(
                    'Maximum resend attempts reached. Please try again later.',
                    'OTP_RESEND_LIMIT_EXCEEDED',
                )

            raw = self._generate_raw_code()
            VerificationCode.objects.create(
                user=user,
                purpose=purpose,
                code=self._hash(raw),
                expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
                resend_count=cumulative + 1,
            )
            return raw


class AuthService:
    def issue_tokens(self, user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': AuthUserSerializer(user).data,
        }

    def validate_auth_account(self, user: User) -> None:
        if user.account_status == AccountStatus.PENDING_VERIFICATION or not user.is_active:
            raise AuthenticationFailed(
                ErrorDetail(
                    'Account is not activated. Please verify your account first.',
                    code='ACCOUNT_INACTIVE',
                )
            )
        if user.account_status == AccountStatus.SUSPENDED:
            raise PermissionDenied(ErrorDetail('This account is suspended.', code='ACCOUNT_SUSPENDED'))
        if user.account_status == AccountStatus.DELETED:
            raise PermissionDenied(ErrorDetail('This account has been deleted.', code='ACCOUNT_DELETED'))
        if user.account_status == AccountStatus.RESTRICTED:
            raise PermissionDenied(ErrorDetail('This account is restricted.', code='ACCOUNT_RESTRICTED'))
        if not user.is_verified:
            raise AuthenticationFailed(
                ErrorDetail(
                    'Account identity not verified. Please verify your email or phone number.',
                    code='ACCOUNT_UNVERIFIED',
                )
            )

    def rotate_refresh(self, refresh_token_str: str) -> dict:
        try:
            old_refresh = RefreshToken(refresh_token_str)
        except TokenError:
            raise AuthenticationFailed(
                ErrorDetail('Invalid or expired refresh token.', code='TOKEN_INVALID')
            )

        try:
            user = User.objects.get(id=old_refresh.payload.get('user_id'))
        except User.DoesNotExist:
            raise AuthenticationFailed(ErrorDetail('User not found.', code='TOKEN_INVALID'))

        self.validate_auth_account(user)

        if getattr(settings, 'ENABLE_TOKEN_BLACKLIST', False):
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )
            jti = old_refresh.payload.get('jti')
            with transaction.atomic():
                outstanding = (
                    OutstandingToken.objects
                    .select_for_update()
                    .filter(jti=jti)
                    .first()
                )
                if outstanding and hasattr(outstanding, 'blacklisted'):
                    raise AuthenticationFailed(
                        ErrorDetail('Refresh token has already been used.', code='TOKEN_INVALID')
                    )
                if outstanding:
                    BlacklistedToken.objects.get_or_create(token=outstanding)
                else:
                    old_refresh.blacklist()

        return self.issue_tokens(user)

    def blacklist(self, refresh_token_str: str, user: User | None = None) -> bool:
        if not getattr(settings, 'ENABLE_TOKEN_BLACKLIST', False):
            return False
        try:
            token = RefreshToken(refresh_token_str)
        except TokenError:
            raise field_error('refresh', 'Invalid or expired refresh token.', 'TOKEN_INVALID')

        if user and str(token.payload.get('user_id')) != str(user.id):
            raise field_error(
                'refresh',
                'Refresh token does not belong to the authenticated user.',
                'TOKEN_INVALID',
            )

        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

        jti = token.payload.get('jti')
        with transaction.atomic():
            outstanding = (
                OutstandingToken.objects
                .select_for_update()
                .filter(jti=jti)
                .first()
            )
            if outstanding and hasattr(outstanding, 'blacklisted'):
                return False
            if outstanding:
                BlacklistedToken.objects.get_or_create(token=outstanding)
            else:
                token.blacklist()
        return True

    def blacklist_all_for_user(self, user: User) -> None:
        if not getattr(settings, 'ENABLE_TOKEN_BLACKLIST', False):
            return
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

    def issue_password_reset_token(self, user: User) -> str:
        token = AccessToken()
        token.set_exp(lifetime=timedelta(minutes=15))
        token['user_id'] = str(user.id)
        token['token_type'] = 'password_reset'
        return str(token)

    def validate_password_reset_token(self, token_str: str) -> User:
        try:
            token = UntypedToken(token_str)
        except TokenError:
            raise field_error('reset_token', 'Invalid or expired reset token.', 'TOKEN_INVALID')
        if token.get('token_type') != 'password_reset':
            raise field_error('reset_token', 'Invalid token type.', 'TOKEN_INVALID')
        try:
            return User.objects.get(id=token['user_id'])
        except User.DoesNotExist:
            raise field_error('reset_token', 'User not found.', 'TOKEN_INVALID')


def get_user_by_identifier(identifier: str, require_active: bool = True) -> User:
    from core.validators import is_email, is_phone

    if is_email(identifier):
        lookup = {'email': identifier}
    elif is_phone(identifier):
        lookup = {'phone_number': identifier}
    else:
        raise AuthenticationFailed(
            ErrorDetail('Identifier must be a valid email or phone number.', code='VALIDATION_ERROR')
        )

    try:
        user = User.objects.get(**lookup)
    except User.DoesNotExist:
        raise AuthenticationFailed(
            ErrorDetail('No account found with these credentials.', code='INVALID_CREDENTIALS')
        )

    if require_active:
        AuthService().validate_auth_account(user)

    return user


class RegisterService:
    def __init__(self) -> None:
        self._otp = OTPService()
        self._verification = VerificationService()

    def register(self, validated_data: dict) -> dict:
        user = User.objects.create_user(
            full_name=validated_data['full_name'],
            email=validated_data.get('email'),
            phone_number=validated_data.get('phone_number'),
            password=validated_data['password'],
            is_active=False,
            account_status=AccountStatus.PENDING_VERIFICATION,
        )
        code = self._otp.generate(user, VerificationPurpose.REGISTER)
        self._verification.send(user, code)
        return {'user': AuthUserSerializer(user).data}

    def activate(self, identifier: str, code: str) -> dict:
        user = get_user_by_identifier(identifier, require_active=False)
        if user.account_status == AccountStatus.ACTIVE and user.is_active:
            raise detail_error('This account is already verified.', 'ACCOUNT_ALREADY_VERIFIED')

        self._otp.verify(user, VerificationPurpose.REGISTER, code)

        update_fields = ['is_active', 'account_status']
        user.is_active = True
        user.account_status = AccountStatus.ACTIVE
        if user.email:
            user.email_verified = True
            update_fields.append('email_verified')
        if user.phone_number:
            user.phone_verified = True
            update_fields.append('phone_verified')
        user.save(update_fields=update_fields)
        return AuthService().issue_tokens(user)


class LoginService:
    def authenticate(self, identifier: str, password: str) -> dict:
        user = get_user_by_identifier(identifier, require_active=False)

        if user.account_status == AccountStatus.PENDING_VERIFICATION or not user.is_active:
            raise AuthenticationFailed(
                ErrorDetail(
                    'Account is not activated. Please verify your account first.',
                    code='ACCOUNT_INACTIVE',
                )
            )
        if user.account_status in {
            AccountStatus.SUSPENDED,
            AccountStatus.DELETED,
            AccountStatus.RESTRICTED,
        }:
            AuthService().validate_auth_account(user)
        if user.is_locked:
            raise PermissionDenied(
                ErrorDetail(
                    'Your account has been temporarily locked after too many failed login attempts.',
                    code='ACCOUNT_LOCKED',
                )
            )
        if not user.check_password(password):
            user.failed_login_count += 1
            if user.failed_login_count >= FAILED_LOGIN_MAX_ATTEMPTS:
                user.locked_until = timezone.now() + timedelta(minutes=ACCOUNT_LOCK_DURATION_MINUTES)
            user.save(update_fields=['failed_login_count', 'locked_until'])
            raise AuthenticationFailed(ErrorDetail('Invalid credentials.', code='INVALID_CREDENTIALS'))

        AuthService().validate_auth_account(user)
        user.failed_login_count = 0
        user.locked_until = None
        user.last_login = timezone.now()
        user.save(update_fields=['failed_login_count', 'locked_until', 'last_login'])
        return AuthService().issue_tokens(user)


class PasswordService:
    def __init__(self) -> None:
        self._otp = OTPService()
        self._verification = VerificationService()
        self._auth = AuthService()

    def forgot_password(self, identifier: str) -> None:
        try:
            user = get_user_by_identifier(identifier, require_active=True)
        except AuthenticationFailed:
            return

        code = self._otp.generate(user, VerificationPurpose.PASSWORD_RESET)
        self._verification.send(user, code)

    def verify_reset_code(self, identifier: str, code: str) -> str:
        try:
            user = get_user_by_identifier(identifier, require_active=True)
        except AuthenticationFailed:
            raise field_error('identifier', 'No active account found with this identifier.', 'ACCOUNT_INACTIVE')

        self._otp.verify(user, VerificationPurpose.PASSWORD_RESET, code)

        if user.failed_login_count > 0 or user.locked_until:
            user.failed_login_count = 0
            user.locked_until = None
            user.save(update_fields=['failed_login_count', 'locked_until'])

        return self._auth.issue_password_reset_token(user)

    def reset_password(self, reset_token: str, new_password: str) -> None:
        user = self._auth.validate_password_reset_token(reset_token)
        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            raise ValidationError({'new_password': list(exc.messages)})

        user.set_password(new_password)
        user.save(update_fields=['password'])
        self._auth.blacklist_all_for_user(user)

    def change_password(self, user: User, old_password: str, new_password: str) -> None:
        if not user.check_password(old_password):
            raise field_error('old_password', 'Current password is incorrect.', 'VALIDATION_ERROR')
        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            raise ValidationError({'new_password': list(exc.messages)})

        user.set_password(new_password)
        user.save(update_fields=['password'])
        self._auth.blacklist_all_for_user(user)
