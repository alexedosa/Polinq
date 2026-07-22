export class ApiError extends Error {
  constructor({ code, errors, message, status }) {
    super(message || 'Request failed.')
    this.name = 'ApiError'
    this.code = code || 'REQUEST_FAILED'
    this.errors = errors || {}
    this.fieldErrors = this.errors
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

function firstErrorMessage(errors) {
  if (!errors) {
    return ''
  }
  if (Array.isArray(errors)) {
    return flattenMessages(errors)[0] || ''
  }
  if (typeof errors === 'object') {
    const detailMessages = flattenMessages(errors.detail)
    if (detailMessages.length) {
      return detailMessages[0]
    }

    const nonFieldMessages = flattenMessages(errors.non_field_errors)
    if (nonFieldMessages.length) {
      return nonFieldMessages[0]
    }

    return Object.values(errors).flatMap(flattenMessages)[0] || ''
  }
  return String(errors)
}

export function hasFieldErrors(error) {
  if (!(error instanceof ApiError) || !error.errors || Array.isArray(error.errors)) {
    return false
  }

  return Object.keys(error.errors).some((field) => !['detail', 'non_field_errors'].includes(field))
}

export function formErrorMessage(error) {
  if (!error) {
    return ''
  }
  if (error instanceof ApiError) {
    const backendErrorMessage = firstErrorMessage(error.errors)
    if (backendErrorMessage) {
      return backendErrorMessage
    }
    if (error.code === 'THROTTLED') {
      return error.message || 'Too many attempts. Please wait before trying again.'
    }
    if (error.code === 'NETWORK_ERROR') {
      return error.message || "We couldn't connect to Polinq. Check your connection and try again."
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
