const ACCESS_TOKEN_KEY = 'polinq.access_token'
const REFRESH_TOKEN_KEY = 'polinq.refresh_token'

export function getStoredTokens() {
  const access = window.localStorage.getItem(ACCESS_TOKEN_KEY) || ''
  const refresh = window.localStorage.getItem(REFRESH_TOKEN_KEY) || ''

  return {
    access: access.trim(),
    refresh: refresh.trim(),
  }
}

export function storeTokens(tokens) {
  if (!tokens?.access || !tokens?.refresh) {
    clearStoredTokens()
    return
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}

export function clearStoredTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
