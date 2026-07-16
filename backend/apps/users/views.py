"""
Authentication views for Linkora.

Rules:
  - Views are thin. They: validate → delegate to service → return response.
  - No business logic here.
  - All heavy lifting is in services.py.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.users.serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    OTPResendSerializer,
    OTPVerifySerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    TokenRefreshSerializer,
    VerifyResetCodeSerializer,
)
from apps.users.services import (
    AuthService,
    LoginService,
    OTPService,
    PasswordService,
    RegisterService,
    VerificationService,
    get_user_by_identifier,
)
from apps.users.choices import VerificationPurpose
from core.responses import success_response


# ─────────────────────────────────────────────────────────────────────────────
# Registration
# ─────────────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Create an inactive user and send a verification OTP.
    The account is not usable until verify-otp is called.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth_register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = RegisterService().register(serializer.validated_data)
        return success_response('Registration successful. A verification code has been sent.', result, status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────────────────
# OTP Verification
# ─────────────────────────────────────────────────────────────────────────────

class VerifyOTPView(APIView):
    """
    POST /api/v1/auth/verify-otp/

    Verify an OTP for any supported purpose.
    For REGISTER purpose: activates the account and returns JWT tokens.
    For all other purposes: returns a success message.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth_verify_otp'

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        identifier = data['identifier']
        purpose = data['purpose']
        code = data['code']

        # REGISTER is the only purpose that activates + issues tokens
        if purpose == VerificationPurpose.REGISTER:
            tokens = RegisterService().activate(identifier, code)
            return success_response('Account verified successfully.', tokens, status.HTTP_200_OK)

        # All other purposes — just verify
        user = get_user_by_identifier(identifier, require_active=False)
        OTPService().verify(user, purpose, code)
        return success_response('Verification successful.', {}, status.HTTP_200_OK)


class ResendOTPView(APIView):
    """
    POST /api/v1/auth/resend-otp/

    Resend a verification code for any supported purpose.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth_resend_otp'

    def post(self, request):
        serializer = OTPResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        user = get_user_by_identifier(data['identifier'], require_active=False)

        code = OTPService().resend(user, data['purpose'])
        VerificationService().send(user, code)

        return success_response('A new verification code has been sent.', {}, status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Login & Logout
# ─────────────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    """
    POST /api/v1/auth/login/

    Authenticate using email or phone number + password.
    Returns JWT Access and Refresh tokens on success.

    Returns HTTP 423 if the account is locked due to too many failed attempts.
    The user must use the forgot-password flow to unlock their account.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth_login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        tokens = LoginService().authenticate(
            identifier=data['identifier'],
            password=data['password'],
        )
        return success_response('Login successful.', tokens, status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    Blacklist the submitted refresh token (when token blacklisting is enabled).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        blacklisted = AuthService().blacklist(serializer.validated_data['refresh'], user=request.user)
        message = 'Logged out successfully.' if blacklisted else 'Session was already logged out.'
        return success_response(message, {}, status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Token Refresh
# ─────────────────────────────────────────────────────────────────────────────

class TokenRefreshView(APIView):
    """
    POST /api/v1/auth/refresh/

    Rotate the refresh token and issue a new Access + Refresh pair.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tokens = AuthService().rotate_refresh(serializer.validated_data['refresh'])
        return success_response('Token refreshed successfully.', tokens, status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Password Management
# ─────────────────────────────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/

    Authenticated users can change their own password by providing their
    current password. All refresh tokens are blacklisted after the change.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        PasswordService().change_password(
            user=request.user,
            old_password=data['old_password'],
            new_password=data['new_password'],
        )
        return success_response('Password changed successfully.', {}, status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """
    POST /api/v1/auth/forgot-password/

    Trigger a password-reset OTP for the given identifier (email or phone).
    This endpoint also serves as the unlock mechanism when an account is
    locked after too many failed login attempts.

    Always returns 200 to avoid revealing whether the account exists.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth_forgot_password'

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        PasswordService().forgot_password(serializer.validated_data['identifier'])

        return success_response(
            'If an account with this identifier exists, a verification code has been sent.',
            {},
            status.HTTP_200_OK,
        )


class VerifyResetCodeView(APIView):
    """
    POST /api/v1/auth/verify-reset-code/

    Verify the password-reset OTP.
    On success: clears the account lock and returns a short-lived reset token.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth_verify_reset_code'

    def post(self, request):
        serializer = VerifyResetCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        reset_token = PasswordService().verify_reset_code(
            identifier=data['identifier'],
            code=data['code'],
        )
        return success_response('Reset code verified successfully.', {'reset_token': reset_token}, status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    POST /api/v1/auth/reset-password/

    Set a new password using the short-lived reset token obtained from
    verify-reset-code. All existing refresh tokens are blacklisted after reset.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth_reset_password'

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        PasswordService().reset_password(
            reset_token=data['reset_token'],
            new_password=data['new_password'],
        )
        return success_response('Password reset successful. Please log in again.', {}, status.HTTP_200_OK)
