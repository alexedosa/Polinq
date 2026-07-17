import { useState } from 'react'
import { AuthFooter } from '../../components/auth/AuthFooter.jsx'
import { AuthHeader } from '../../components/auth/AuthHeader.jsx'
import { AuthInput } from '../../components/auth/AuthInput.jsx'
import { PasswordInput } from '../../components/auth/PasswordInput.jsx'
import { AppLink } from '../../components/routing/AppLink.jsx'
import { PrimaryButton } from '../../components/ui/Button.jsx'
import { useAuth } from './useAuth.js'
import { AuthForm } from './AuthForm.jsx'
import { SocialAuthGroup } from './SocialAuthGroup.jsx'
import { fieldMessage, formErrorMessage } from '../../services/api/errors.js'
import { navigateTo } from '../../lib/navigation.js'

export function LoginForm() {
  const { signIn } = useAuth()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const updateField = (field) => (event) => {
    setError(null)
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function handleSubmit() {
    if (isLoading) {
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const tokenData = await signIn({
        identifier: form.identifier.trim(),
        password: form.password,
      })
      navigateTo(tokenData.user?.onboarding_complete ? '/pulse' : '/onboarding/username')
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthHeader
        title="Welcome Back!"
        description="Local opportunities start here."
      />
      {error ? <p className="form-status form-status--error" role="alert">{formErrorMessage(error)}</p> : null}
      <div className="field-stack">
        <AuthInput
          autoComplete="username"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'identifier')}
          label="Email or phone number"
          name="identifier"
          onChange={updateField('identifier')}
          placeholder="you@example.com or +234..."
          value={form.identifier}
        />
        <PasswordInput
          autoComplete="current-password"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'password')}
          label="Password"
          name="password"
          onChange={updateField('password')}
          placeholder="Enter your password"
          value={form.password}
        />
      </div>
      <div className="form-row">
        <span />
        <AppLink className="text-link" to="/forgot-password">
          Forgot password
        </AppLink>
      </div>
      <PrimaryButton disabled={!form.identifier.trim() || !form.password} isLoading={isLoading} type="submit">Continue</PrimaryButton>
      <SocialAuthGroup />
      <AuthFooter prompt="Don't have an account?" actionLabel="Create account" to="/register" />
    </AuthForm>
  )
}
