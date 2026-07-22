import { API_BASE_URL } from '../../config/env.js'
import { clearStoredTokens, getStoredTokens, storeTokens } from '../auth/tokenStorage.js'
import { ApiError } from './errors.js'

let refreshPromise = null
let onUnauthorized = () => undefined
let authGeneration = 0

export function invalidateAuthRequests() {
  authGeneration += 1
  refreshPromise = null
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => null)

  if (!payload || typeof payload.success !== 'boolean') {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      errors: {},
      message: 'Unexpected server response.',
      status: response.status,
    })
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError({
      code: response.status === 429 ? 'THROTTLED' : payload.code,
      errors: payload.errors,
      message: response.status === 429 && !payload.message
        ? 'Too many attempts. Please wait before trying again.'
        : payload.message,
      status: response.status,
    })
  }

  return payload
}

async function refreshTokens() {
  const generation = authGeneration
  const { refresh } = getStoredTokens()
  if (!refresh) {
    throw new ApiError({
      code: 'TOKEN_INVALID',
      errors: {},
      message: 'Your session has expired. Please sign in again.',
      status: 401,
    })
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh/`, {
      body: JSON.stringify({ refresh }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
      .catch(() => {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        errors: {},
        message: "We couldn't connect to Polinq. Check your connection and try again.",
        status: 0,
      })
      })
      .then(parseResponse)
      .then((payload) => {
        if (generation !== authGeneration) {
          throw new ApiError({
            code: 'SESSION_CHANGED',
            errors: {},
            message: 'Your session changed. Please sign in again.',
            status: 401,
          })
        }
        storeTokens(payload.data)
        return payload.data.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export async function apiRequest(path, options = {}) {
  const {
    auth = true,
    body,
    headers = {},
    retry = true,
    timeoutMs = 15000,
    ...requestOptions
  } = options
  const { access } = getStoredTokens()
  const requestGeneration = authGeneration

  const requestHeaders = {
    ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...headers,
  }

  if (auth && access) {
    requestHeaders.Authorization = `Bearer ${access}`
  }

  async function sendRequest(requestHeadersToUse) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        ...requestOptions,
        body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
        headers: requestHeadersToUse,
        signal: controller.signal,
      })
    } catch {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        errors: {},
        message: "We couldn't connect to Polinq. Check your connection and try again.",
        status: 0,
      })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const response = await sendRequest(requestHeaders)

  if (requestGeneration !== authGeneration) {
    throw new ApiError({
      code: 'SESSION_CHANGED',
      errors: {},
      message: 'Your session changed. Please sign in again.',
      status: 401,
    })
  }

  try {
    return await parseResponse(response)
  } catch (error) {
    const canRefresh = auth && retry && error instanceof ApiError && error.status === 401
    if (!canRefresh) {
      throw error
    }

    let nextAccess
    try {
      nextAccess = await refreshTokens()
      if (requestGeneration !== authGeneration) {
        throw new ApiError({
          code: 'SESSION_CHANGED',
          errors: {},
          message: 'Your session changed. Please sign in again.',
          status: 401,
        })
      }
    } catch (refreshError) {
      clearStoredTokens()
      onUnauthorized()
      throw refreshError
    }

    const retryHeaders = { ...requestHeaders, Authorization: `Bearer ${nextAccess}` }
    const retryResponse = await sendRequest(retryHeaders)
    return await parseResponse(retryResponse)
  }
}
