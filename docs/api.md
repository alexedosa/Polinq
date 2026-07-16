# Polinq API

## Authentication

Base path: `/api/v1/auth/`

All successful authentication responses use:

```json
{
  "success": true,
  "message": "Human-readable message.",
  "data": {}
}
```

All API errors use:

```json
{
  "success": false,
  "message": "Human-readable message.",
  "code": "MACHINE_READABLE_CODE",
  "errors": {}
}
```

Authenticated endpoints require:

```http
Authorization: Bearer <access_token>
```

### User Object

Authentication payloads return users with this shape:

```json
{
  "id": "uuid",
  "full_name": "Ada Lovelace",
  "email": "ada@example.com",
  "phone_number": null,
  "is_verified": true,
  "account_status": "ACTIVE"
}
```

Supported account statuses are `ACTIVE`, `PENDING_VERIFICATION`, `RESTRICTED`, `SUSPENDED`, and `DELETED`.

### Endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register/` | Create a pending account and send an OTP. | No |
| POST | `/api/v1/auth/verify-otp/` | Verify an OTP. Registration verification activates the account and returns tokens. | No |
| POST | `/api/v1/auth/resend-otp/` | Resend an OTP, subject to resend limit and cooldown. | No |
| POST | `/api/v1/auth/login/` | Authenticate with email or phone plus password. | No |
| POST | `/api/v1/auth/refresh/` | Rotate refresh token and return a new token pair. | No |
| POST | `/api/v1/auth/logout/` | Blacklist the submitted refresh token. | Yes |
| POST | `/api/v1/auth/change-password/` | Change the authenticated user's password. | Yes |
| POST | `/api/v1/auth/forgot-password/` | Send a password reset OTP if the account exists. | No |
| POST | `/api/v1/auth/verify-reset-code/` | Verify password reset OTP and return a reset token. | No |
| POST | `/api/v1/auth/reset-password/` | Set a new password using a reset token. | No |

### Request And Success Shapes

`POST /api/v1/auth/register/`

```json
{
  "full_name": "Ada Lovelace",
  "email": "ada@example.com",
  "phone_number": null,
  "password": "SecurePass123!",
  "confirm_password": "SecurePass123!"
}
```

Success data:

```json
{
  "user": {}
}
```

`POST /api/v1/auth/verify-otp/`

```json
{
  "identifier": "ada@example.com",
  "purpose": "REGISTER",
  "code": "123456"
}
```

Success data for `REGISTER`:

```json
{
  "access": "jwt",
  "refresh": "jwt",
  "user": {}
}
```

Success data for other purposes is `{}`.

`POST /api/v1/auth/resend-otp/`

```json
{
  "identifier": "ada@example.com",
  "purpose": "REGISTER"
}
```

Success data: `{}`.

`POST /api/v1/auth/login/`

```json
{
  "identifier": "ada@example.com",
  "password": "SecurePass123!"
}
```

Success data:

```json
{
  "access": "jwt",
  "refresh": "jwt",
  "user": {}
}
```

`POST /api/v1/auth/refresh/`

```json
{
  "refresh": "jwt"
}
```

Success data:

```json
{
  "access": "jwt",
  "refresh": "jwt",
  "user": {}
}
```

Refresh only succeeds for active, verified accounts that are not restricted, suspended, or deleted.

`POST /api/v1/auth/logout/`

```json
{
  "refresh": "jwt"
}
```

Success data: `{}`.

`POST /api/v1/auth/change-password/`

```json
{
  "old_password": "SecurePass123!",
  "new_password": "NewSecurePass123!"
}
```

Success data: `{}`.

`POST /api/v1/auth/forgot-password/`

```json
{
  "identifier": "ada@example.com"
}
```

Success data: `{}`. The response does not reveal whether the account exists.

`POST /api/v1/auth/verify-reset-code/`

```json
{
  "identifier": "ada@example.com",
  "code": "123456"
}
```

Success data:

```json
{
  "reset_token": "jwt"
}
```

`POST /api/v1/auth/reset-password/`

```json
{
  "reset_token": "jwt",
  "new_password": "NewSecurePass123!"
}
```

Success data: `{}`.

### Error Codes

Authentication endpoints may return these machine-readable codes:

- `VALIDATION_ERROR`
- `INVALID_CREDENTIALS`
- `OTP_EXPIRED`
- `OTP_INVALID`
- `OTP_ATTEMPTS_EXCEEDED`
- `OTP_RESEND_COOLDOWN`
- `OTP_RESEND_LIMIT_EXCEEDED`
- `ACCOUNT_INACTIVE`
- `ACCOUNT_UNVERIFIED`
- `ACCOUNT_LOCKED`
- `ACCOUNT_RESTRICTED`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DELETED`
- `TOKEN_INVALID`
- `TOKEN_EXPIRED`
- `PERMISSION_DENIED`
- `THROTTLED`

### Security Constraints

- OTPs are stored using Django password hashers, not plaintext.
- OTP verification is attempt-limited and expiry-limited.
- OTP resend is count-limited and cooldown-limited.
- Refresh tokens rotate and the previous refresh token is blacklisted when token blacklisting is enabled.
- Logout validates the submitted refresh token and does not silently ignore malformed or unrelated tokens.
- Development OTP delivery uses Django cache keys instead of console-printing raw OTPs.
