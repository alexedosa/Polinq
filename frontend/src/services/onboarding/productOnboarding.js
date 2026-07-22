const PRODUCT_ONBOARDING_COMPLETED_KEY = 'polinq.product_onboarding_completed'
const AUTH_TRANSITION_COVER_KEY = 'polinq.auth_transition_cover'

function productOnboardingKey(subjectId) {
  return subjectId
    ? `${PRODUCT_ONBOARDING_COMPLETED_KEY}.${subjectId}`
    : PRODUCT_ONBOARDING_COMPLETED_KEY
}

export function hasCompletedProductOnboarding(subjectId) {
  return window.localStorage.getItem(productOnboardingKey(subjectId)) === 'true'
}

export function completeProductOnboarding(subjectId) {
  window.localStorage.setItem(productOnboardingKey(subjectId), 'true')
}

export function setAuthenticationTransitionCover() {
  window.sessionStorage.setItem(AUTH_TRANSITION_COVER_KEY, 'true')
}

export function hasAuthenticationTransitionCover() {
  return window.sessionStorage.getItem(AUTH_TRANSITION_COVER_KEY) === 'true'
}

export function clearAuthenticationTransitionCover() {
  window.sessionStorage.removeItem(AUTH_TRANSITION_COVER_KEY)
}
