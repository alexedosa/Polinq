import { AuthDivider } from '../../components/auth/AuthDivider.jsx'
import { SocialButton } from '../../components/auth/SocialButton.jsx'

export function SocialAuthGroup() {
  return (
    <>
      <AuthDivider />
      <div className="social-stack">
        <SocialButton provider="google" />
        <SocialButton provider="apple" />
      </div>
    </>
  )
}
