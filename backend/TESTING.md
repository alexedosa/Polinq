# Linkora API Testing Guide (Postman)

This guide provides step-by-step instructions for testing every authentication endpoint in the Linkora backend using Postman.

---

## Global Setup & Conventions

* **Base URL**: `http://127.0.0.1:8000` or `http://localhost:8000`
* **Default Header for JSON**: `Content-Type: application/json`
* **OTP Code Source**: Since no email/SMS provider is connected, look at the terminal/console running your Django server (`python manage.py runserver`). Stubs print codes like this:
  `[EMAIL STUB] → Recipient: john@example.com | Code: 123456`
* **How to authenticate requests**: For endpoints requiring authentication, add the following header to the request:
  * **Key**: `Authorization`
  * **Value**: `Bearer <your_access_token>`

---

## 1. End-to-End Test Flow

Test the API in this exact order to ensure state-dependent endpoints work:

```
1. Register John Doe (inactive account)
   ↓
2. Check terminal for OTP → Verify Registration OTP (activates account)
   ↓
3. Login (issues Access + Refresh tokens)
   ↓
4. Refresh Token (verifies rotation)
   ↓
5. Change Password (invalidates old sessions)
   ↓
6. Logout (blacklists current token)
   ↓
7. Login with New Password
   ↓
8. Forgot Password (requests OTP to unlock or reset)
   ↓
9. Check terminal for OTP → Verify Reset Code (returns reset_token)
   ↓
10. Reset Password (sets final password)
    ↓
11. Login Again (confirms password reset)
    ↓
12. Test Account Lock (fail password 7 times → account locks)
    ↓
13. Unlock Account (forgot-password → verify-reset-code clears lock)
    ↓
14. Login Successfully
```

---

## 2. Endpoint Catalog

### 1. Register User
* **Endpoint URL**: `POST /api/users/register/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+2348012345678",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!"
  }
  ```
* **Expected Success Response (201 Created)**:
  ```json
  {
    "detail": "Registration successful. A verification code has been sent to your contact."
  }
  ```
* **Expected Error Responses**:
  * **Email/Phone already exists (400 Bad Request)**:
    ```json
    {
      "email": ["An account with this email already exists."],
      "phone_number": ["An account with this phone number already exists."]
    }
    ```
  * **Passwords mismatch (400 Bad Request)**:
    ```json
    {
      "non_field_errors": ["Passwords do not match."]
    }
    ```
  * **Weak password (400 Bad Request)**:
    ```json
    {
      "password": ["This password is too common.", "This password is too short."]
    }
    ```

---

### 2. Verify OTP
* **Endpoint URL**: `POST /api/users/verify-otp/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "identifier": "john@example.com",
    "purpose": "REGISTER",
    "code": "123456"
  }
  ```
* **Expected Success Response (200 OK - REGISTER purpose only)**:
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
  *(Note: For other purposes like EMAIL_VERIFICATION, it returns `{"detail": "Verification successful."}`)*
* **Expected Error Responses**:
  * **Wrong/Invalid Code (400 Bad Request)**:
    ```json
    {
      "code": "Invalid verification code."
    }
    ```
  * **Expired Code (400 Bad Request)**:
    ```json
    {
      "code": "This verification code has expired."
    }
    ```
  * **Max attempts exceeded (400 Bad Request)**:
    ```json
    {
      "code": "Maximum verification attempts exceeded. Please request a new code."
    }
    ```

---

### 3. Resend OTP
* **Endpoint URL**: `POST /api/users/resend-otp/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "identifier": "john@example.com",
    "purpose": "REGISTER"
  }
  ```
* **Expected Success Response (200 OK)**:
  ```json
  {
    "detail": "A new verification code has been sent."
  }
  ```
* **Expected Error Responses**:
  * **Too many resends (400 Bad Request)**:
    ```json
    {
      "detail": "Maximum resend attempts reached. Please try again later."
    }
    ```

---

### 4. Login
* **Endpoint URL**: `POST /api/users/login/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "identifier": "john@example.com",
    "password": "SecurePass123!"
  }
  ```
* **Expected Success Response (200 OK)**:
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
* **Expected Error Responses**:
  * **Unverified/Inactive Account (401 Unauthorized)**:
    ```json
    {
      "detail": "Account is not activated. Please verify your account first."
    }
    ```
  * **Incorrect Password (401 Unauthorized)**:
    ```json
    {
      "detail": "Invalid credentials."
    }
    ```
  * **Locked Account (403 Forbidden)**:
    ```json
    {
      "detail": "Your account has been temporarily locked after too many failed login attempts. Use the forgot-password endpoint to verify your identity and unlock your account."
    }
    ```

---

### 5. Logout
* **Endpoint URL**: `POST /api/users/logout/`
* **Authentication required?**: Yes (`Bearer <access_token>`)
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <johns_access_token>`
* **Request Body (JSON)**:
  ```json
  {
    "refresh": "<refresh_token_to_blacklist>"
  }
  ```
* **Expected Success Response (200 OK)**:
  ```json
  {
    "detail": "Logged out successfully."
  }
  ```
* **Expected Error Responses**:
  * **No/Invalid Access Token (401 Unauthorized)**:
    ```json
    {
      "detail": "Given token not valid for any token type"
    }
    ```

---

### 6. Refresh Token
* **Endpoint URL**: `POST /api/users/refresh/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "refresh": "<your_refresh_token>"
  }
  ```
* **Expected Success Response (200 OK - rotates the tokens)**:
  ```json
  {
    "access": "new_access_token_here",
    "refresh": "new_refresh_token_here"
  }
  ```
* **Expected Error Responses**:
  * **Invalid/Blacklisted Refresh Token (401 Unauthorized)**:
    ```json
    {
      "detail": "Invalid or expired refresh token."
    }
    ```

---

### 7. Change Password
* **Endpoint URL**: `POST /api/users/change-password/`
* **Authentication required?**: Yes (`Bearer <access_token>`)
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <johns_access_token>`
* **Request Body (JSON)**:
  ```json
  {
    "old_password": "SecurePass123!",
    "new_password": "NewSecurePass456!"
  }
  ```
* **Expected Success Response (200 OK)**:
  ```json
  {
    "detail": "Password changed successfully."
  }
  ```
* **Expected Error Responses**:
  * **Wrong old password (400 Bad Request)**:
    ```json
    {
      "old_password": "Current password is incorrect."
    }
    ```
  * **Weak password validation fails (400 Bad Request)**:
    ```json
    {
      "new_password": ["This password is too short."]
    }
    ```

---

### 8. Forgot Password
* **Endpoint URL**: `POST /api/users/forgot-password/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "identifier": "john@example.com"
  }
  ```
* **Expected Success Response (200 OK)**:
  ```json
  {
    "detail": "If an account with this identifier exists, a verification code has been sent."
  }
  ```
  *(Note: To prevent account enumeration attacks, this always returns 200 even if the user does not exist).*

---

### 9. Verify Reset Code
* **Endpoint URL**: `POST /api/users/verify-reset-code/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "identifier": "john@example.com",
    "code": "123456"
  }
  ```
* **Expected Success Response (200 OK)**:
  ```json
  {
    "reset_token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
* **Expected Error Responses**:
  * **Invalid / Expired code (400 Bad Request)**:
    ```json
    {
      "code": "Invalid verification code."
    }
    ```

---

### 10. Reset Password
* **Endpoint URL**: `POST /api/users/reset-password/`
* **Authentication required?**: No
* **Headers**:
  * `Content-Type: application/json`
* **Request Body (JSON)**:
  ```json
  {
    "reset_token": "<reset_token_from_verify_reset_code>",
    "new_password": "FinalSecurePass789!"
  }
  ```
* **Expected Success Response (200 OK)**:
  ```json
  {
    "detail": "Password reset successful. Please log in again."
  }
  ```
* **Expected Error Responses**:
  * **Invalid Reset Token (400 Bad Request)**:
    ```json
    {
      "reset_token": "Invalid or expired reset token."
    }
    ```
  * **Weak password validators fail (400 Bad Request)**:
    ```json
    {
      "new_password": ["This password is too common."]
    }
    ```

---

## 3. Postman Testing Checklist

Use this checklist to track your manual test progression:

- [ ] **1. Register Account**
  - Verify email validation format fails on `john`
  - Verify uniqueness fails when submitting `john@example.com` twice
  - Verify password confirmation validates correctly
- [ ] **2. Verify Registration OTP**
  - Retrieve code from console output
  - Verify code triggers proper token return
  - Verify code becomes single-use (fails if submitted again)
- [ ] **3. Login**
  - Verify success with email (`john@example.com`)
  - Verify success with phone (`+2348012345678`)
  - Verify 401 Unauthorized occurs on incorrect credentials
- [ ] **4. Refresh Token**
  - Verify rotation changes both the Access and Refresh values
  - Verify old refresh token is rejected if re-submitted
- [ ] **5. Change Password**
  - Verify active JWT validates on Bearer token
  - Verify old password correctness checks out
- [ ] **6. Logout**
  - Verify Bearer token is required
  - Verify token is blacklisted and cannot refresh
- [ ] **7. Forgot Password**
  - Verify silence check: returns 200 on `non_existing@example.com`
  - Verify valid email triggers a code to Django console
- [ ] **8. Verify Reset Code**
  - Verify it delivers a temporary `reset_token`
- [ ] **9. Reset Password**
  - Verify reset token changes the password
  - Verify outstanding JWTs are blacklisted
- [ ] **10. Account Lockout**
  - Submit wrong password 7 times continuously
  - Verify Login endpoint returns 403 locked response
  - Submit forgot password + verify reset code to confirm the lock clears
