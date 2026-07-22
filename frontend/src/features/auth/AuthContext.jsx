import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invalidateAuthRequests, setUnauthorizedHandler } from '../../services/api/client.js'
import { login as loginRequest, logout as logoutRequest } from '../../services/auth/authApi.js'
import { clearPendingOtp, clearResetToken } from '../../services/auth/authSession.js'
import { clearStoredTokens, getStoredTokens, storeTokens } from '../../services/auth/tokenStorage.js'
import { getMyProfile } from '../../services/profiles/profileApi.js'
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

const developmentDemoProfile = {
  demo_professional_preview: true,
  display_name: 'Polinq Demo',
  discovery_radius_km: 25,
  location_label: 'Demo workspace',
  onboarding_complete: true,
  onboarding_status: 'COMPLETED',
  profile_photo_url: '',
  user_id: 'development-demo-user',
  username: 'demo',
}

function isDevelopmentDemoSession() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 'true'
}

export function AuthProvider({ children }) {
  const demoSession = isDevelopmentDemoSession()
  const [status, setStatus] = useState(demoSession ? 'authenticated' : 'loading')
  const [user, setUser] = useState(demoSession ? userFromProfile(developmentDemoProfile) : null)
  const [profile, setProfile] = useState(demoSession ? developmentDemoProfile : null)
  const bootstrapped = useRef(false)

  const clearSession = useCallback(() => {
    if (demoSession) {
      return
    }
    invalidateAuthRequests()
    clearStoredTokens()
    clearPendingOtp()
    clearResetToken()
    setUser(null)
    setProfile(null)
    setStatus('unauthenticated')
  }, [demoSession])

  const refreshProfile = useCallback(async () => {
    if (demoSession) {
      return developmentDemoProfile
    }
    const nextProfile = await getMyProfile()
    setProfile(nextProfile)
    return nextProfile
  }, [demoSession])

  const establishSession = useCallback(
    async (tokenData, { fetchProfile = true } = {}) => {
      if (demoSession) {
        return
      }
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
    [clearSession, demoSession, refreshProfile],
  )

  const signIn = useCallback(
    async (payload) => {
      if (demoSession) {
        return { profile: developmentDemoProfile, user: userFromProfile(developmentDemoProfile) }
      }
      const tokenData = await loginRequest(payload)
      await establishSession(tokenData)
      return tokenData
    },
    [demoSession, establishSession],
  )

  const signOut = useCallback(async () => {
    if (demoSession) {
      return
    }
    const { access, refresh } = getStoredTokens()
    clearSession()
    try {
      if (refresh) {
        await logoutRequest(refresh, access)
      }
    } catch {
      // Local logout must complete even when the network or access token fails.
    }
  }, [clearSession, demoSession])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
  }, [clearSession])

  useEffect(() => {
    if (bootstrapped.current) {
      return
    }
    bootstrapped.current = true
    if (demoSession) {
      return
    }

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
  }, [clearSession, demoSession, refreshProfile])

  const onboardingComplete = isComplete(profile) || isComplete(user)

  const value = useMemo(
    () => ({
      clearSession,
      establishSession,
      isDemoSession: demoSession,
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
      demoSession,
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
