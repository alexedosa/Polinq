import { OnboardingStep } from '../../../../features/onboarding/OnboardingStep.jsx'

export function ProfileOnboardingPage() {
  return (
    <OnboardingStep
      eyebrow="Profile onboarding"
      title="Add the details people should see."
      description="Profile photo and bio are optional, but help your profile feel complete."
      fields={[
        { label: 'Display name', placeholder: 'Ada Lovelace' },
        { label: 'Bio', placeholder: 'A short introduction' },
      ]}
      nextLabel="Continue"
    />
  )
}
