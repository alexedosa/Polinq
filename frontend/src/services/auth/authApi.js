import { apiRequest } from '../api/client.js'

export const REGISTER_PURPOSE = 'REGISTER'
export const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET'

export async function register(payload) {
  const response = await apiRequest('/auth/register/', {
    auth: false,
    body: payload,
    method: 'POST',
  })
  return response.data
}

export async function verifyOtp(payload) {
  const response = await apiRequest('/auth/verify-otp/', {
    auth: false,
    body: payload,
    method: 'POST',
  })
  return response.data
}

export async function resendOtp(payload) {
  const response = await apiRequest('/auth/resend-otp/', {
    auth: false,
    body: payload,
    method: 'POST',
  })
  return response.data
}

export async function login(payload) {
  const response = await apiRequest('/auth/login/', {
    auth: false,
    body: payload,
    method: 'POST',
  })
  return response.data
}

export async function logout(refresh, access) {
  const response = await apiRequest('/auth/logout/', {
    auth: false,
    body: { refresh },
    headers: access ? { Authorization: `Bearer ${access}` } : {},
    method: 'POST',
    retry: false,
  })
  return response.data
}

export async function forgotPassword(payload) {
  const response = await apiRequest('/auth/forgot-password/', {
    auth: false,
    body: payload,
    method: 'POST',
  })
  return response.data
}

export async function verifyResetCode(payload) {
  const response = await apiRequest('/auth/verify-reset-code/', {
    auth: false,
    body: payload,
    method: 'POST',
  })
  return response.data
}

export async function resetPassword(payload) {
  const response = await apiRequest('/auth/reset-password/', {
    auth: false,
    body: payload,
    method: 'POST',
  })
  return response.data
}

export async function getMyProfile() {
  const response = await apiRequest('/profiles/me/', {
    method: 'GET',
  })
  return response.data.profile
}
