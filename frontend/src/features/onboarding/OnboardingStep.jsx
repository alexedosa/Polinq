import { AuthInput } from '../../components/auth/AuthInput.jsx'
import { Logo } from '../../components/branding/Logo.jsx'
import { SectionTitle } from '../../components/layout/SectionTitle.jsx'
import { AppLink } from '../../components/routing/AppLink.jsx'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'

export function OnboardingStep({ description, eyebrow, fields, nextLabel, title }) {
  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <Logo />
        <span>Profile setup</span>
      </header>
      <section className="onboarding-panel">
        <SectionTitle eyebrow={eyebrow} title={title} description={description} />
        <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
          <div className="field-stack">
            {fields.map((field) => (
              <AuthInput
                key={field.label}
                label={field.label}
                name={field.label.toLowerCase().replaceAll(' ', '-')}
                placeholder={field.placeholder}
              />
            ))}
          </div>
          <PrimaryButton type="submit">{nextLabel}</PrimaryButton>
          <SecondaryButton as={AppLink} to="/pulse">
            Skip preview
          </SecondaryButton>
        </form>
      </section>
    </main>
  )
}
