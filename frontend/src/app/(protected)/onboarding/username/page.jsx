import { OnboardingStep } from '../../../../features/onboarding/OnboardingStep.jsx'

export function UsernameOnboardingPage() {
  return (
    <OnboardingStep
      eyebrow="Profile onboarding"
      title="Choose your public username."
      description="This will become your visible identity across Polinq."
      fields={[{ label: 'Username', placeholder: 'muzan' }]}
      nextLabel="Continue"
    />
  )
}
