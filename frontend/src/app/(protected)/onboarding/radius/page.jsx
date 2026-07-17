import { OnboardingStep } from '../../../../features/onboarding/OnboardingStep.jsx'

export function RadiusOnboardingPage() {
  return (
    <OnboardingStep
      eyebrow="Profile onboarding"
      title="Choose your discovery radius."
      description="Control how close opportunities and professionals should be."
      fields={[{ label: 'Radius', placeholder: '25 km' }]}
      nextLabel="Enter Pulse"
    />
  )
}
