import { useState } from 'react'
import { AuthHeader } from '../../components/auth/AuthHeader.jsx'
import { AuthFooter } from '../../components/auth/AuthFooter.jsx'
import { PasswordInput } from '../../components/auth/PasswordInput.jsx'
import { PrimaryButton } from '../../components/ui/Button.jsx'
import { ApiError, fieldMessage, formErrorMessage } from '../../services/api/errors.js'
import { resetPassword } from '../../services/auth/authApi.js'
import { clearResetToken, getResetToken } from '../../services/auth/authSession.js'
import { navigateTo } from '../../lib/navigation.js'
import { AuthForm } from './AuthForm.jsx'

export function ResetPasswordForm() {
  const [form, setForm] = useState({ confirm_password: '', password: '' })
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasResetToken = Boolean(getResetToken())

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
      const resetToken = getResetToken()
      if (!resetToken) {
        throw new ApiError({
          code: 'TOKEN_INVALID',
          errors: {},
          message: 'Your reset session has expired. Request a new code.',
          status: 400,
        })
      }
      if (form.password !== form.confirm_password) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          errors: { confirm_password: 'Passwords do not match.' },
          message: 'Passwords do not match.',
          status: 400,
        })
      }
      await resetPassword({
        new_password: form.password,
        reset_token: resetToken,
      })
      clearResetToken()
      navigateTo('/login')
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthHeader
        eyebrow="CREATE A NEW PASSWORD"
        title="Secure your account."
        description="Choose a new password for your Polinq account."
      />
      {!hasResetToken ? (
        <p className="form-status form-status--error" role="alert">
          Your reset session has expired. Request a new code.
        </p>
      ) : null}
      {error ? <p className="form-status form-status--error" role="alert">{formErrorMessage(error)}</p> : null}
      <div className="field-stack">
        <PasswordInput
          autoComplete="new-password"
          disabled={isLoading || !hasResetToken}
          error={fieldMessage(error?.errors, 'new_password')}
          label="Password"
          name="password"
          onChange={updateField('password')}
          value={form.password}
        />
        <PasswordInput
          autoComplete="new-password"
          disabled={isLoading || !hasResetToken}
          error={fieldMessage(error?.errors, 'confirm_password')}
          label="Confirm Password"
          name="confirm_password"
          onChange={updateField('confirm_password')}
          placeholder="Confirm password"
          value={form.confirm_password}
        />
      </div>
      <PrimaryButton
        disabled={!hasResetToken || !form.password || !form.confirm_password}
        isLoading={isLoading}
        type="submit"
      >
        Continue
      </PrimaryButton>
      <AuthFooter prompt="Return to" actionLabel="Sign in" to="/login" />
    </AuthForm>
  )
}
