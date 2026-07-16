from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.models import User, VerificationCode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['-date_joined']
    list_display = [
        'id', 'full_name', 'email', 'phone_number',
        'account_status', 'is_active', 'email_verified', 'phone_verified',
        'is_staff', 'failed_login_count', 'date_joined',
    ]
    list_filter = ['account_status', 'is_active', 'is_staff', 'email_verified', 'phone_verified']
    search_fields = ['email', 'phone_number', 'full_name']
    readonly_fields = ['id', 'date_joined', 'last_login']

    fieldsets = (
        (None, {'fields': ('id', 'email', 'phone_number', 'password')}),
        ('Personal', {'fields': ('full_name',)}),
        ('Verification', {'fields': ('email_verified', 'phone_verified')}),
        ('Account State', {'fields': ('account_status', 'is_active', 'is_staff', 'is_superuser')}),
        ('Login Security', {'fields': ('failed_login_count', 'locked_until')}),
        ('Timestamps', {'fields': ('date_joined', 'last_login')}),
        ('Permissions', {'fields': ('groups', 'user_permissions')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone_number', 'full_name', 'password1', 'password2'),
        }),
    )

    # Override required for custom User model (no username field)
    filter_horizontal = ('groups', 'user_permissions')


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'purpose', 'expires_at',
        'used_at', 'attempt_count', 'resend_count', 'created_at',
    ]
    list_filter = ['purpose']
    search_fields = ['user__email', 'user__phone_number']
    readonly_fields = ['id', 'code', 'created_at']
    ordering = ['-created_at']
