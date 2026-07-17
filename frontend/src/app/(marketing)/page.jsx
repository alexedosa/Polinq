import { Logo } from '../../components/branding/Logo.jsx'
import { AppLink } from '../../components/routing/AppLink.jsx'
import { PrimaryButton } from '../../components/ui/Button.jsx'

export function HomePage() {
  return (
    <main className="landing-shell" aria-labelledby="landing-title">
      <section className="landing-inner">
        <Logo size="large" />
        <div className="landing-copy">
          <h1 id="landing-title">Local opportunities, made clearer.</h1>
          <p>
            Polinq connects people with trusted professionals and structured
            opportunities around their community.
          </p>
        </div>
        <PrimaryButton as={AppLink} to="/login">
          Enter Polinq
        </PrimaryButton>
      </section>
    </main>
  )
}
