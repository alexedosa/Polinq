import { Logo } from '../../../components/branding/Logo.jsx'
import { SectionTitle } from '../../../components/layout/SectionTitle.jsx'
import { SecondaryButton } from '../../../components/ui/Button.jsx'
import { useAuth } from '../../../features/auth/useAuth.js'

export function PulsePage() {
  const { signOut } = useAuth()

  return (
    <main className="pulse-shell">
      <header className="pulse-header">
        <Logo />
        <SecondaryButton onClick={signOut}>
          Logout
        </SecondaryButton>
      </header>
      <section className="pulse-main" aria-labelledby="pulse-title">
        <SectionTitle
          eyebrow="Pulse"
          title="Your local opportunity surface is being prepared."
          description="This is a UI placeholder for the future authenticated product workspace."
          id="pulse-title"
        />
      </section>
    </main>
  )
}
