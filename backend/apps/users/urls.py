from django.urls import path
from apps.users.views import (
    ChangePasswordView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    RegisterView,
    ResendOTPView,
    ResetPasswordView,
    TokenRefreshView,
    VerifyOTPView,
    VerifyResetCodeView,
)

urlpatterns = [
    # Registration
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),

    # Session
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Password management
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-reset-code/', VerifyResetCodeView.as_view(), name='verify-reset-code'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
]
