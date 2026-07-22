import { useEffect, useState } from 'react'
import { HomePage } from './app/(marketing)/page.jsx'
import { ProductOnboardingPage } from './app/(marketing)/product-onboarding/page.jsx'
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
import { DashboardPlaceholderPage, PulsePage } from './app/(protected)/pulse/page.jsx'
import { AppShell } from './components/layout/AppShell.jsx'
import { AppLink } from './components/routing/AppLink.jsx'
import { useAuth } from './features/auth/useAuth.js'
import { dashboardRouteTitles } from './lib/dashboardNavigation.js'
import { navigateTo } from './lib/navigation.js'
import { hasCompletedProductOnboarding } from './services/onboarding/productOnboarding.js'

function createDashboardPage(path) {
  return function DashboardRoutePage() {
    return <DashboardPlaceholderPage path={path} />
  }
}

const routes = {
  '/': HomePage,
  '/product-onboarding': ProductOnboardingPage,
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
  '/discover': createDashboardPage('/discover'),
  '/messages': createDashboardPage('/messages'),
  '/saved': createDashboardPage('/saved'),
  '/my-linqs': createDashboardPage('/my-linqs'),
  '/profile': createDashboardPage('/profile'),
  '/professional': createDashboardPage('/professional'),
}

const authenticationEntryRoute = '/login'

const authRoutes = new Set([
  '/login',
  '/register',
  '/verify-otp',
  '/forgot-password',
  '/reset-password',
])

const productOnboardingRoutes = new Set([
  '/product-onboarding',
])

const dashboardRoutes = new Set(Object.keys(dashboardRouteTitles))

const protectedRoutes = new Set([
  '/onboarding',
  '/onboarding/username',
  '/onboarding/profile',
  '/onboarding/location',
  '/onboarding/radius',
  ...dashboardRoutes,
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
  const { isAuthenticated, isDemoSession, loading, onboardingComplete, profile, user } = useAuth()

  useEffect(() => {
    const handleRouteChange = () => setPath(currentPath())
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  const Page = routes[path] ?? NotFoundPage
  const isAuthRoute = authRoutes.has(path)
  const isProductOnboardingRoute = productOnboardingRoutes.has(path)
  const isProtectedRoute = protectedRoutes.has(path)
  const isOnboardingRoute = onboardingRoutes.has(path)
  const isDashboardRoute = isProtectedRoute && !isOnboardingRoute
  const isDemoDashboardRoute = isDemoSession && isDashboardRoute
  const productOnboardingSubjectId = profile?.user_id || user?.id
  const productOnboardingComplete = hasCompletedProductOnboarding(
    isAuthenticated ? productOnboardingSubjectId : undefined,
  )

  if (loading) {
    return <LoadingPage />
  }

  if (isDemoDashboardRoute) {
    return (
      <AppShell currentPath={path}>
        <Page />
      </AppShell>
    )
  }

  if (isProductOnboardingRoute && isAuthenticated) {
    if (onboardingComplete) {
      return <Redirect to="/pulse" />
    }
    if (productOnboardingComplete) {
      return <Redirect to="/onboarding/username" />
    }
  }

  if (path === '/' && isAuthenticated) {
    return <Redirect to={onboardingComplete ? '/pulse' : productOnboardingComplete ? '/onboarding/username' : '/product-onboarding'} />
  }

  if (path === '/') {
    return <Redirect to={authenticationEntryRoute} />
  }

  if (path === '/product-onboarding' && !isAuthenticated) {
    return <Redirect to="/login" />
  }

  if (path === '/product-onboarding' && isAuthenticated && productOnboardingComplete) {
    return <Redirect to="/onboarding/username" />
  }

  if (isAuthRoute && isAuthenticated) {
    return <Redirect to={onboardingComplete ? '/pulse' : productOnboardingComplete ? '/onboarding/username' : '/product-onboarding'} />
  }

  if (isProtectedRoute && !isAuthenticated) {
    return <Redirect to="/login" />
  }

  if (isProtectedRoute && !isOnboardingRoute && isAuthenticated && !onboardingComplete) {
    return <Redirect to={productOnboardingComplete ? '/onboarding/username' : '/product-onboarding'} />
  }

  if (isOnboardingRoute && isAuthenticated && !onboardingComplete && !productOnboardingComplete) {
    return <Redirect to="/product-onboarding" />
  }

  if (isOnboardingRoute && isAuthenticated && onboardingComplete) {
    return <Redirect to="/pulse" />
  }

  if (isAuthRoute) {
    return (
      <AuthLayout>
        <Page />
      </AuthLayout>
    )
  }

  if (isDashboardRoute) {
    return (
      <AppShell currentPath={path}>
        <Page />
      </AppShell>
    )
  }

  return <Page />
}

export default App
