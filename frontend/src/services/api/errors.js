export class ApiError extends Error {
  constructor({ code, errors, message, status }) {
    super(message || 'Request failed.')
    this.name = 'ApiError'
    this.code = code || 'REQUEST_FAILED'
    this.errors = errors || {}
    this.status = status || 0
  }
}

function flattenMessages(value) {
  if (Array.isArray(value)) {
    return value.flatMap(flattenMessages)
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(flattenMessages)
  }
  return value ? [String(value)] : []
}

export function fieldMessage(errors, field) {
  const value = errors?.[field]
  return flattenMessages(value).join(' ')
}

export function formErrorMessage(error) {
  if (!error) {
    return ''
  }
  if (error instanceof ApiError) {
    if (error.code === 'THROTTLED') {
      return error.message || 'Too many attempts. Please wait before trying again.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
