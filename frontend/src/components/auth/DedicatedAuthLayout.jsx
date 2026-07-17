import { Logo } from '../branding/Logo.jsx'
import { AuthCityGrid } from './AuthCityGrid.jsx'

export function DedicatedAuthLayout({ children }) {
  return (
    <div className="dedicated-auth-shell">
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
