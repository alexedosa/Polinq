import { useEffect, useState } from 'react'
import { AuthHeader } from '../../components/auth/AuthHeader.jsx'
import { AuthInput } from '../../components/auth/AuthInput.jsx'
import { AppLink } from '../../components/routing/AppLink.jsx'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { ApiError, fieldMessage, formErrorMessage } from '../../services/api/errors.js'
import {
  PASSWORD_RESET_PURPOSE,
  REGISTER_PURPOSE,
  resendOtp,
  verifyOtp,
  verifyResetCode,
} from '../../services/auth/authApi.js'
import {
  clearPendingOtp,
  getPendingOtp,
  setResetToken,
} from '../../services/auth/authSession.js'
import { navigateTo } from '../../lib/navigation.js'
import { useAuth } from './useAuth.js'
import { AuthForm } from './AuthForm.jsx'

export function VerifyOtpForm() {
  const { establishSession } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(60)
  const pendingOtp = getPendingOtp()

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined
    }
    const timer = window.setTimeout(() => setCooldown((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function handleSubmit() {
    if (isLoading || code.length !== 6) {
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      if (!pendingOtp.identifier || !pendingOtp.purpose) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          errors: {},
          message: 'Start from registration or password reset to request a verification code.',
          status: 400,
        })
      }

      if (pendingOtp.purpose === PASSWORD_RESET_PURPOSE) {
        const result = await verifyResetCode({ code, identifier: pendingOtp.identifier })
        setResetToken(result.reset_token)
        clearPendingOtp()
        navigateTo('/reset-password')
        return
      }

      const result = await verifyOtp({
        code,
        identifier: pendingOtp.identifier,
        purpose: pendingOtp.purpose || REGISTER_PURPOSE,
      })
      clearPendingOtp()
      await establishSession(result)
      navigateTo(result.user?.onboarding_complete ? '/pulse' : '/onboarding/username')
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    if (isResending || cooldown > 0) {
      return
    }
    setError(null)
    setIsResending(true)
    try {
      if (!pendingOtp.identifier || !pendingOtp.purpose) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          errors: {},
          message: 'Start from registration or password reset to request a verification code.',
          status: 400,
        })
      }
      await resendOtp({
        identifier: pendingOtp.identifier,
        purpose: pendingOtp.purpose,
      })
      setCooldown(60)
    } catch (nextError) {
      if (nextError?.code === 'OTP_RESEND_COOLDOWN') {
        setCooldown(60)
      }
      setError(nextError)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthHeader
        eyebrow="VERIFY YOUR EMAIL"
        title="Enter your code."
        description="We sent a six-digit verification code to your email."
      />
      {error ? <p className="form-status form-status--error" role="alert">{formErrorMessage(error)}</p> : null}
      <div className="field-stack">
        <AuthInput
          autoComplete="one-time-code"
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'code')}
          inputMode="numeric"
          label="Verification code"
          maxLength={6}
          name="code"
          onChange={(event) => {
            setError(null)
            setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
          }}
          pattern="[0-9]*"
          placeholder="000000"
          value={code}
        />
      </div>
      <div className="form-row">
        <p className="muted-line">
          {cooldown > 0 ? `Resend available in 00:${String(cooldown).padStart(2, '0')}` : 'You can request a new code.'}
        </p>
        <button
          className="text-link auth-inline-action"
          disabled={cooldown > 0 || isResending}
          onClick={handleResend}
          type="button"
        >
          {isResending ? 'Sending...' : 'Resend'}
        </button>
      </div>
      <PrimaryButton disabled={code.length !== 6} isLoading={isLoading} type="submit">Continue</PrimaryButton>
      <SecondaryButton as={AppLink} to="/login">
        Back
      </SecondaryButton>
    </AuthForm>
  )
}
