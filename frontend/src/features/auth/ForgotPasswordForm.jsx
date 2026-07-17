import { useState } from 'react'
import { AuthFooter } from '../../components/auth/AuthFooter.jsx'
import { AuthHeader } from '../../components/auth/AuthHeader.jsx'
import { AuthInput } from '../../components/auth/AuthInput.jsx'
import { PrimaryButton } from '../../components/ui/Button.jsx'
import { fieldMessage, formErrorMessage } from '../../services/api/errors.js'
import { PASSWORD_RESET_PURPOSE, forgotPassword } from '../../services/auth/authApi.js'
import { setPendingOtp } from '../../services/auth/authSession.js'
import { navigateTo } from '../../lib/navigation.js'
import { AuthForm } from './AuthForm.jsx'

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit() {
    if (isLoading) {
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const normalizedIdentifier = identifier.trim()
      await forgotPassword({ identifier: normalizedIdentifier })
      setPendingOtp({ identifier: normalizedIdentifier, purpose: PASSWORD_RESET_PURPOSE })
      navigateTo('/verify-otp')
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthHeader
        eyebrow="RESET YOUR PASSWORD"
        title="Find your account."
        description="Enter your email or phone number to receive a reset code."
      />
      {error ? <p className="form-status form-status--error" role="alert">{formErrorMessage(error)}</p> : null}
      <div className="field-stack">
        <AuthInput
          autoComplete="username"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'identifier')}
          label="Email or phone number"
          name="identifier"
          onChange={(event) => {
            setError(null)
            setIdentifier(event.target.value)
          }}
          placeholder="you@example.com or +234..."
          value={identifier}
        />
      </div>
      <PrimaryButton disabled={!identifier.trim()} isLoading={isLoading} type="submit">Continue</PrimaryButton>
      <AuthFooter prompt="Remembered it?" actionLabel="Sign in" to="/login" />
    </AuthForm>
  )
}
