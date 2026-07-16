from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.users.choices import AccountStatus, VerificationPurpose
from apps.users.models import User, VerificationCode
from apps.users.services import AuthService, OTPService


TEST_REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'auth_register': '100/minute',
        'auth_login': '100/minute',
        'auth_verify_otp': '100/minute',
        'auth_resend_otp': '100/minute',
        'auth_forgot_password': '100/minute',
        'auth_verify_reset_code': '100/minute',
        'auth_reset_password': '100/minute',
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}


@override_settings(
    REST_FRAMEWORK=TEST_REST_FRAMEWORK,
    ENABLE_DEVELOPMENT_OTP_OUTBOX=True,
    ENABLE_EMAIL_VERIFICATION=True,
    ENABLE_PHONE_VERIFICATION=True,
    OTP_RESEND_COOLDOWN_SECONDS=0,
    PASSWORD_HASHERS=('django.contrib.auth.hashers.MD5PasswordHasher',),
)
class AuthenticationContractTests(TestCase):
    def setUp(self):
        cache.clear()
        self._old_throttle_rates = ScopedRateThrottle.THROTTLE_RATES
        ScopedRateThrottle.THROTTLE_RATES = TEST_REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
        self.client = APIClient()

    def tearDown(self):
        ScopedRateThrottle.THROTTLE_RATES = self._old_throttle_rates

    def register_payload(self, email='ada@example.com'):
        return {
            'full_name': 'Ada Lovelace',
            'email': email,
            'password': 'SecurePass123!',
            'confirm_password': 'SecurePass123!',
        }

    def create_active_user(self, email='ada@example.com', password='SecurePass123!', **extra):
        defaults = {
            'full_name': 'Ada Lovelace',
            'email': email,
            'password': password,
            'is_active': True,
            'account_status': AccountStatus.ACTIVE,
            'email_verified': True,
        }
        defaults.update(extra)
        return User.objects.create_user(**defaults)

    def test_registration_returns_standard_envelope(self):
        response = self.client.post('/api/v1/auth/register/', self.register_payload(), format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], 'Registration successful. A verification code has been sent.')
        self.assertIn('user', response.data['data'])
        self.assertEqual(response.data['data']['user']['account_status'], AccountStatus.PENDING_VERIFICATION)
        self.assertTrue(User.objects.filter(email='ada@example.com', is_active=False).exists())

    def test_duplicate_registration_returns_standard_error(self):
        self.create_active_user()

        response = self.client.post('/api/v1/auth/register/', self.register_payload(), format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['code'], 'VALIDATION_ERROR')
        self.assertIn('email', response.data['errors'])

    def test_register_otp_verification_activates_and_returns_tokens_and_user(self):
        self.client.post('/api/v1/auth/register/', self.register_payload(), format='json')
        code = cache.get('dev-otp:email:ada@example.com')

        response = self.client.post(
            '/api/v1/auth/verify-otp/',
            {'identifier': 'ada@example.com', 'purpose': VerificationPurpose.REGISTER, 'code': code},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])
        self.assertEqual(response.data['data']['user']['account_status'], AccountStatus.ACTIVE)

    def test_expired_otp_returns_machine_code(self):
        user = User.objects.create_user(
            full_name='Ada Lovelace',
            email='ada@example.com',
            password='SecurePass123!',
            is_active=False,
            account_status=AccountStatus.PENDING_VERIFICATION,
        )
        code = OTPService().generate(user, VerificationPurpose.REGISTER)
        VerificationCode.objects.filter(user=user).update(expires_at=timezone.now() - timedelta(minutes=1))

        response = self.client.post(
            '/api/v1/auth/verify-otp/',
            {'identifier': user.email, 'purpose': VerificationPurpose.REGISTER, 'code': code},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'OTP_EXPIRED')

    def test_resend_limit_is_enforced(self):
        self.client.post('/api/v1/auth/register/', self.register_payload(), format='json')
        user = User.objects.get(email='ada@example.com')

        for _ in range(3):
            VerificationCode.objects.filter(user=user).update(
                created_at=timezone.now() - timedelta(minutes=5)
            )
            response = self.client.post(
                '/api/v1/auth/resend-otp/',
                {'identifier': user.email, 'purpose': VerificationPurpose.REGISTER},
                format='json',
            )
            self.assertEqual(response.status_code, 200)

        VerificationCode.objects.filter(user=user).update(created_at=timezone.now() - timedelta(minutes=5))
        response = self.client.post(
            '/api/v1/auth/resend-otp/',
            {'identifier': user.email, 'purpose': VerificationPurpose.REGISTER},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'OTP_RESEND_LIMIT_EXCEEDED')

    def test_login_success_and_invalid_login(self):
        self.create_active_user()

        success = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': 'ada@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        failure = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': 'ada@example.com', 'password': 'wrong-password'},
            format='json',
        )

        self.assertEqual(success.status_code, 200)
        self.assertIn('access', success.data['data'])
        self.assertEqual(failure.status_code, 401)
        self.assertEqual(failure.data['code'], 'INVALID_CREDENTIALS')

    def test_lockout(self):
        self.create_active_user()

        response = None
        for _ in range(7):
            response = self.client.post(
                '/api/v1/auth/login/',
                {'identifier': 'ada@example.com', 'password': 'wrong-password'},
                format='json',
            )

        self.assertEqual(response.status_code, 401)
        locked = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': 'ada@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        self.assertEqual(locked.status_code, 403)
        self.assertEqual(locked.data['code'], 'ACCOUNT_LOCKED')

    def test_inactive_and_suspended_accounts_cannot_login(self):
        User.objects.create_user(
            full_name='Pending User',
            email='pending@example.com',
            password='SecurePass123!',
            is_active=False,
            account_status=AccountStatus.PENDING_VERIFICATION,
        )
        self.create_active_user(email='suspended@example.com', account_status=AccountStatus.SUSPENDED)

        inactive = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': 'pending@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        suspended = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': 'suspended@example.com', 'password': 'SecurePass123!'},
            format='json',
        )

        self.assertEqual(inactive.data['code'], 'ACCOUNT_INACTIVE')
        self.assertEqual(suspended.data['code'], 'ACCOUNT_SUSPENDED')

    def test_refresh_rotates_and_rejects_reuse(self):
        user = self.create_active_user()
        tokens = AuthService().issue_tokens(user)

        response = self.client.post('/api/v1/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        reused = self.client.post('/api/v1/auth/refresh/', {'refresh': tokens['refresh']}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('refresh', response.data['data'])
        self.assertEqual(reused.status_code, 401)
        self.assertEqual(reused.data['code'], 'TOKEN_INVALID')

    def test_logout_blacklists_refresh(self):
        user = self.create_active_user()
        tokens = AuthService().issue_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')

        response = self.client.post('/api/v1/auth/logout/', {'refresh': tokens['refresh']}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])

    def test_password_reset_flow(self):
        self.create_active_user()

        forgot = self.client.post(
            '/api/v1/auth/forgot-password/',
            {'identifier': 'ada@example.com'},
            format='json',
        )
        code = cache.get('dev-otp:email:ada@example.com')
        verify = self.client.post(
            '/api/v1/auth/verify-reset-code/',
            {'identifier': 'ada@example.com', 'code': code},
            format='json',
        )
        reset = self.client.post(
            '/api/v1/auth/reset-password/',
            {'reset_token': verify.data['data']['reset_token'], 'new_password': 'NewSecurePass123!'},
            format='json',
        )
        login = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': 'ada@example.com', 'password': 'NewSecurePass123!'},
            format='json',
        )

        self.assertEqual(forgot.status_code, 200)
        self.assertEqual(verify.status_code, 200)
        self.assertEqual(reset.status_code, 200)
        self.assertEqual(login.status_code, 200)


class AuthenticationThrottleTests(TestCase):
    def test_login_throttle_uses_standard_error_envelope(self):
        throttled_rest_framework = TEST_REST_FRAMEWORK.copy()
        throttled_rest_framework['DEFAULT_THROTTLE_RATES'] = {
            **TEST_REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
            'auth_login': '1/minute',
        }

        with override_settings(REST_FRAMEWORK=throttled_rest_framework):
            cache.clear()
            old_rates = ScopedRateThrottle.THROTTLE_RATES
            ScopedRateThrottle.THROTTLE_RATES = throttled_rest_framework['DEFAULT_THROTTLE_RATES']
            client = APIClient()
            payload = {'identifier': 'missing@example.com', 'password': 'wrong-password'}
            client.post('/api/v1/auth/login/', payload, format='json')
            response = client.post('/api/v1/auth/login/', payload, format='json')
            ScopedRateThrottle.THROTTLE_RATES = old_rates

        self.assertEqual(response.status_code, 429)
        self.assertFalse(response.data['success'])
