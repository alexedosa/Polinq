const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '')
