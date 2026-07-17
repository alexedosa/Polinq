import { useEffect, useState } from 'react'
import { HomePage } from './app/(marketing)/page.jsx'
import { AuthLayout } from './app/(auth)/layout.jsx'
import { ForgotPasswordPage } from './app/(auth)/forgot-password/page.jsx'
import { LoginPage } from './app/(auth)/login/page.jsx'
import { RegisterPage } from './app/(auth)/register/page.jsx'
import { ResetPasswordPage } from './app/(auth)/reset-password/page.jsx'
import { VerifyOtpPage } from './app/(auth)/verify-otp/page.jsx'
import { LocationOnboardingPage } from './app/(protected)/onboarding/location/page.jsx'
import { ProfileOnboardingPage } from './app/(protected)/onboarding/profile/page.jsx'
import { RadiusOnboardingPage } from './app/(protected)/onboarding/radius/page.jsx'
import { UsernameOnboardingPage } from './app/(protected)/onboarding/username/page.jsx'
import { PulsePage } from './app/(protected)/pulse/page.jsx'
import { AppLink } from './components/routing/AppLink.jsx'
import { useAuth } from './features/auth/useAuth.js'
import { navigateTo } from './lib/navigation.js'

const routes = {
  '/': HomePage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/verify-otp': VerifyOtpPage,
  '/forgot-password': ForgotPasswordPage,
  '/reset-password': ResetPasswordPage,
  '/onboarding': UsernameOnboardingPage,
  '/onboarding/username': UsernameOnboardingPage,
  '/onboarding/profile': ProfileOnboardingPage,
  '/onboarding/location': LocationOnboardingPage,
  '/onboarding/radius': RadiusOnboardingPage,
  '/pulse': PulsePage,
}

const authRoutes = new Set([
  '/login',
  '/register',
  '/verify-otp',
  '/forgot-password',
  '/reset-password',
])

const protectedRoutes = new Set([
  '/onboarding',
  '/onboarding/username',
  '/onboarding/profile',
  '/onboarding/location',
  '/onboarding/radius',
  '/pulse',
])

const onboardingRoutes = new Set([
  '/onboarding',
  '/onboarding/username',
  '/onboarding/profile',
  '/onboarding/location',
  '/onboarding/radius',
])

function currentPath() {
  return window.location.pathname.replace(/\/$/, '') || '/'
}

function NotFoundPage() {
  return (
    <main className="not-found-shell">
      <p className="eyebrow">404</p>
      <h1>That route is not part of Polinq yet.</h1>
      <AppLink className="text-link" to="/">
        Return home
      </AppLink>
    </main>
  )
}

function LoadingPage() {
  return (
    <main className="route-loading-shell" aria-live="polite">
      <span>Loading</span>
    </main>
  )
}

function Redirect({ to }) {
  useEffect(() => {
    navigateTo(to, { replace: true })
  }, [to])

  return <LoadingPage />
}

function App() {
  const [path, setPath] = useState(currentPath)
  const { isAuthenticated, loading, onboardingComplete } = useAuth()

  useEffect(() => {
    const handleRouteChange = () => setPath(currentPath())
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  const Page = routes[path] ?? NotFoundPage
  const isAuthRoute = authRoutes.has(path)
  const isProtectedRoute = protectedRoutes.has(path)
  const isOnboardingRoute = onboardingRoutes.has(path)

  if (loading) {
    return <LoadingPage />
  }

  if (isAuthRoute && isAuthenticated) {
    return <Redirect to={onboardingComplete ? '/pulse' : '/onboarding/username'} />
  }

  if (isProtectedRoute && !isAuthenticated) {
    return <Redirect to="/login" />
  }

  if (isOnboardingRoute && isAuthenticated && onboardingComplete) {
    return <Redirect to="/pulse" />
  }

  if (path === '/pulse' && isAuthenticated && !onboardingComplete) {
    return <Redirect to="/onboarding/username" />
  }

  if (isAuthRoute) {
    return (
      <AuthLayout>
        <Page />
      </AuthLayout>
    )
  }

  return <Page />
}

export default App
