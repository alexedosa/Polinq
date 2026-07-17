import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invalidateAuthRequests, setUnauthorizedHandler } from '../../services/api/client.js'
import { getMyProfile, login as loginRequest, logout as logoutRequest } from '../../services/auth/authApi.js'
import { clearPendingOtp, clearResetToken } from '../../services/auth/authSession.js'
import { clearStoredTokens, getStoredTokens, storeTokens } from '../../services/auth/tokenStorage.js'
import { AuthContext } from './authContextObject.js'

function isComplete(entity) {
  return entity?.onboarding_complete === true || entity?.onboarding_status === 'COMPLETED'
}

function userFromProfile(profile) {
  if (!profile) {
    return null
  }
  return {
    full_name: profile.display_name,
    id: profile.user_id,
    onboarding_complete: profile.onboarding_complete,
    onboarding_status: profile.onboarding_status,
    username: profile.username,
  }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const bootstrapped = useRef(false)

  const clearSession = useCallback(() => {
    invalidateAuthRequests()
    clearStoredTokens()
    clearPendingOtp()
    clearResetToken()
    setUser(null)
    setProfile(null)
    setStatus('unauthenticated')
  }, [])

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getMyProfile()
    setProfile(nextProfile)
    return nextProfile
  }, [])

  const establishSession = useCallback(
    async (tokenData, { fetchProfile = true } = {}) => {
      storeTokens(tokenData)
      let nextProfile = null
      if (fetchProfile) {
        try {
          nextProfile = await refreshProfile()
        } catch (error) {
          clearSession()
          throw error
        }
      }
      setUser(tokenData.user || userFromProfile(nextProfile))
      setStatus('authenticated')
    },
    [clearSession, refreshProfile],
  )

  const signIn = useCallback(
    async (payload) => {
      const tokenData = await loginRequest(payload)
      await establishSession(tokenData)
      return tokenData
    },
    [establishSession],
  )

  const signOut = useCallback(async () => {
    const { access, refresh } = getStoredTokens()
    clearSession()
    try {
      if (refresh) {
        await logoutRequest(refresh, access)
      }
    } catch {
      // Local logout must complete even when the network or access token fails.
    }
  }, [clearSession])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
  }, [clearSession])

  useEffect(() => {
    if (bootstrapped.current) {
      return
    }
    bootstrapped.current = true

    async function restore() {
      const { refresh } = getStoredTokens()
      if (!refresh) {
        clearSession()
        return
      }

      try {
        const nextProfile = await refreshProfile()
        setProfile(nextProfile)
        setUser(userFromProfile(nextProfile))
        setStatus('authenticated')
      } catch {
        clearSession()
      }
    }

    restore()
  }, [clearSession, refreshProfile])

  const onboardingComplete = isComplete(profile) || isComplete(user)

  const value = useMemo(
    () => ({
      clearSession,
      establishSession,
      isAuthenticated: status === 'authenticated',
      loading: status === 'loading',
      onboardingComplete,
      profile,
      refreshProfile,
      signIn,
      signOut,
      status,
      user,
    }),
    [
      clearSession,
      establishSession,
      onboardingComplete,
      profile,
      refreshProfile,
      signIn,
      signOut,
      status,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
