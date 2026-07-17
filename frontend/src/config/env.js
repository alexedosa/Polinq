const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '')
