const OTP_IDENTIFIER_KEY = 'polinq.pending_otp_identifier'
const OTP_PURPOSE_KEY = 'polinq.pending_otp_purpose'
const RESET_TOKEN_KEY = 'polinq.reset_token'

export function setPendingOtp({ identifier, purpose }) {
  window.sessionStorage.setItem(OTP_IDENTIFIER_KEY, identifier.trim())
  window.sessionStorage.setItem(OTP_PURPOSE_KEY, purpose)
}

export function getPendingOtp() {
  return {
    identifier: (window.sessionStorage.getItem(OTP_IDENTIFIER_KEY) || '').trim(),
    purpose: window.sessionStorage.getItem(OTP_PURPOSE_KEY) || '',
  }
}

export function clearPendingOtp() {
  window.sessionStorage.removeItem(OTP_IDENTIFIER_KEY)
  window.sessionStorage.removeItem(OTP_PURPOSE_KEY)
}

export function setResetToken(resetToken) {
  window.sessionStorage.setItem(RESET_TOKEN_KEY, resetToken)
}

export function getResetToken() {
  return (window.sessionStorage.getItem(RESET_TOKEN_KEY) || '').trim()
}

export function clearResetToken() {
  window.sessionStorage.removeItem(RESET_TOKEN_KEY)
}
