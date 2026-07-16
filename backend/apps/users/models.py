import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from apps.users.choices import AccountStatus, VerificationPurpose


# ─────────────────────────────────────────────────────────────────────────────
# User Manager
# ─────────────────────────────────────────────────────────────────────────────

class UserManager(BaseUserManager):
    """Custom manager for creating users and superusers."""

    def create_user(
        self,
        email: str = None,
        phone_number: str = None,
        password: str = None,
        **extra_fields,
    ) -> 'User':
        if not email and not phone_number:
            raise ValueError('User must have either an email or a phone number.')

        if email:
            email = self.normalize_email(email)

        user: User = self.model(
            email=email,
            phone_number=phone_number,
            **extra_fields,
        )

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields) -> 'User':
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('account_status', AccountStatus.ACTIVE)
        extra_fields.setdefault('email_verified', True)

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True.')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email=email, password=password, **extra_fields)


# ─────────────────────────────────────────────────────────────────────────────
# User Model
# ─────────────────────────────────────────────────────────────────────────────

class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for Linkora.

    Authentication is done via email or phone number (identifier field in requests).
    Profile fields (avatar, bio, gender, etc.) live in the profiles app.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)

    # Verification flags — explicit, no generic is_verified stored field
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    # Account state
    is_active = models.BooleanField(default=False)  # False until OTP verified
    account_status = models.CharField(
        max_length=30,
        choices=AccountStatus.choices,
        default=AccountStatus.PENDING_VERIFICATION,
    )
    is_staff = models.BooleanField(default=False)

    # Login protection
    failed_login_count = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    # email is the field used by Django admin and create_superuser
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self) -> str:
        return self.email or self.phone_number or str(self.id)

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def is_verified(self) -> bool:
        """True if the user has verified at least one contact method."""
        return self.email_verified or self.phone_verified

    @property
    def is_locked(self) -> bool:
        """True if the account is currently under a temporary login lock."""
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Verification Code Model
# ─────────────────────────────────────────────────────────────────────────────

class VerificationCode(models.Model):
    """
    Generic one-time verification code.

    Supports all verification purposes: registration, login, email/phone
    verification, password reset, and future 2FA.

    The `code` field is stored as a SHA-256 hash.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='verification_codes',
    )
    purpose = models.CharField(
        max_length=30,
        choices=VerificationPurpose.choices,
    )
    code = models.CharField(max_length=128)  # SHA-256 hash of the raw OTP
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    resend_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'verification_codes'
        verbose_name = 'Verification Code'
        verbose_name_plural = 'Verification Codes'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.user} — {self.purpose} — {self.created_at:%Y-%m-%d %H:%M}'

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_used(self) -> bool:
        return self.used_at is not None
