import { useState } from 'react'
import { AuthFooter } from '../../components/auth/AuthFooter.jsx'
import { AuthHeader } from '../../components/auth/AuthHeader.jsx'
import { AuthInput } from '../../components/auth/AuthInput.jsx'
import { PasswordInput } from '../../components/auth/PasswordInput.jsx'
import { PrimaryButton } from '../../components/ui/Button.jsx'
import { fieldMessage, formErrorMessage } from '../../services/api/errors.js'
import { REGISTER_PURPOSE, register } from '../../services/auth/authApi.js'
import { setPendingOtp } from '../../services/auth/authSession.js'
import { navigateTo } from '../../lib/navigation.js'
import { AuthForm } from './AuthForm.jsx'
import { SocialAuthGroup } from './SocialAuthGroup.jsx'

export function RegisterForm() {
  const [form, setForm] = useState({
    confirm_password: '',
    email: '',
    full_name: '',
    password: '',
  })
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
      const email = form.email.trim()
      await register({
        confirm_password: form.confirm_password,
        email,
        full_name: form.full_name.trim(),
        password: form.password,
        phone_number: null,
      })
      setPendingOtp({ identifier: email, purpose: REGISTER_PURPOSE })
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
        eyebrow="CREATE YOUR ACCOUNT"
        title="Join Polinq."
        description="Local opportunities start here."
      />
      {error ? <p className="form-status form-status--error" role="alert">{formErrorMessage(error)}</p> : null}
      <div className="field-stack">
        <AuthInput
          autoComplete="name"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'full_name')}
          label="Name"
          name="full_name"
          onChange={updateField('full_name')}
          placeholder="Ada Lovelace"
          value={form.full_name}
        />
        <AuthInput
          autoComplete="email"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'email')}
          label="Email"
          name="email"
          onChange={updateField('email')}
          placeholder="you@example.com"
          type="email"
          value={form.email}
        />
        <PasswordInput
          autoComplete="new-password"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'password')}
          label="Password"
          name="password"
          onChange={updateField('password')}
          value={form.password}
        />
        <PasswordInput
          autoComplete="new-password"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'confirm_password')}
          label="Confirm Password"
          name="confirm_password"
          onChange={updateField('confirm_password')}
          placeholder="Confirm password"
          value={form.confirm_password}
        />
      </div>
      <PrimaryButton
        disabled={!form.full_name.trim() || !form.email.trim() || !form.password || !form.confirm_password}
        isLoading={isLoading}
        type="submit"
      >
        Continue
      </PrimaryButton>
      <SocialAuthGroup />
      <AuthFooter prompt="Already have an account?" actionLabel="Sign in" to="/login" />
    </AuthForm>
  )
}
