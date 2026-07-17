import { OnboardingStep } from '../../../../features/onboarding/OnboardingStep.jsx'

export function LocationOnboardingPage() {
  return (
    <OnboardingStep
      eyebrow="Profile onboarding"
      title="Set your local area."
      description="Polinq uses location to keep opportunities relevant without exposing exact coordinates publicly."
      fields={[{ label: 'Location', placeholder: 'Lagos, Nigeria' }]}
      nextLabel="Continue"
    />
  )
}
