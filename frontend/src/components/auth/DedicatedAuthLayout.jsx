import { useEffect, useState } from 'react'
import { Logo } from '../branding/Logo.jsx'
import { AuthCityGrid } from './AuthCityGrid.jsx'
import {
  clearAuthenticationTransitionCover,
  hasAuthenticationTransitionCover,
} from '../../services/onboarding/productOnboarding.js'

export function DedicatedAuthLayout({ children }) {
  const [showTransitionCover] = useState(hasAuthenticationTransitionCover)

  useEffect(() => {
    if (showTransitionCover) {
      clearAuthenticationTransitionCover()
    }
  }, [showTransitionCover])

  return (
    <div className="dedicated-auth-shell">
      {showTransitionCover ? <span className="auth-transition-cover" aria-hidden="true" /> : null}
      <header className="dedicated-auth-brand-header">
        <Logo />
      </header>
      <main className="dedicated-auth-main">
        <AuthCityGrid />
        <section className="dedicated-auth-content" aria-label="Authentication">
          {children}
        </section>
        <p className="dedicated-auth-legal">
          By continuing, you agree to Polinq&apos;s early access terms and privacy practices.
        </p>
      </main>
    </div>
  )
}
