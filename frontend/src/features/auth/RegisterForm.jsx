import { useEffect, useState } from 'react'
import { AuthFooter } from '../../components/auth/AuthFooter.jsx'
import { AuthHeader } from '../../components/auth/AuthHeader.jsx'
import { AuthInput } from '../../components/auth/AuthInput.jsx'
import { PasswordInput } from '../../components/auth/PasswordInput.jsx'
import { PhoneNumberInput } from '../../components/auth/PhoneNumberInput.jsx'
import { PrimaryButton } from '../../components/ui/Button.jsx'
import { ApiError, fieldMessage, formErrorMessage } from '../../services/api/errors.js'
import { REGISTER_PURPOSE, register } from '../../services/auth/authApi.js'
import { setPendingOtp } from '../../services/auth/authSession.js'
import { getRegistrationDraft, setRegistrationDraft } from '../../services/auth/registrationDraft.js'
import { DEFAULT_PHONE_COUNTRY } from '../../services/phone/phoneCountries.js'
import { normalizeLocalPhoneNumber } from '../../services/phone/phoneNumber.js'
import { navigateTo } from '../../lib/navigation.js'
import { AuthForm } from './AuthForm.jsx'
import { SocialAuthGroup } from './SocialAuthGroup.jsx'

export function RegisterForm() {
  const registrationDraft = getRegistrationDraft()
  const [form, setForm] = useState(() => registrationDraft?.form || {
    confirm_password: '',
    email: '',
    full_name: '',
    password: '',
  })
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [localPhoneNumber, setLocalPhoneNumber] = useState(() => registrationDraft?.localPhoneNumber || '')
  const [selectedCountry, setSelectedCountry] = useState(() => (
    registrationDraft?.selectedCountry || DEFAULT_PHONE_COUNTRY
  ))

  useEffect(() => {
    setRegistrationDraft({ form, localPhoneNumber, selectedCountry })
  }, [form, localPhoneNumber, selectedCountry])

  const updateField = (field) => (event) => {
    clearFieldError(field)
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  function clearFieldError(field) {
    setError((current) => {
      if (!(current instanceof ApiError) || !current.errors?.[field]) {
        return current
      }

      const { [field]: removed, ...nextErrors } = current.errors
      void removed

      return new ApiError({
        code: current.code,
        errors: nextErrors,
        message: current.message,
        status: current.status,
      })
    })
  }

  function updatePhoneNumber(value) {
    clearFieldError('phone_number')
    setLocalPhoneNumber(value)
  }

  function updateCountry(country) {
    clearFieldError('phone_number')
    setSelectedCountry(country)
  }

  async function handleSubmit() {
    if (isLoading) {
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const email = form.email.trim()
      const phoneNumber = localPhoneNumber.trim()
      const normalizedPhoneNumber = phoneNumber
        ? normalizeLocalPhoneNumber(phoneNumber, selectedCountry)
        : ''
      const payload = {
        confirm_password: form.confirm_password,
        full_name: form.full_name.trim(),
        password: form.password,
      }

      if (email) {
        payload.email = email
      }
      if (normalizedPhoneNumber) {
        payload.phone_number = normalizedPhoneNumber
      }

      await register(payload)
      setPendingOtp({ identifier: normalizedPhoneNumber || email, purpose: REGISTER_PURPOSE })
      navigateTo('/verify-otp')
    } catch (nextError) {
      if (nextError instanceof ApiError) {
        setError(nextError)
      } else {
        setError(new ApiError({
          code: 'VALIDATION_ERROR',
          errors: { phone_number: [nextError.message] },
          message: 'Please correct the highlighted fields.',
          status: 0,
        }))
      }
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
        <PhoneNumberInput
          disabled={isLoading}
          error={fieldMessage(error?.errors, 'phone_number')}
          localPhoneNumber={localPhoneNumber}
          onCountryChange={updateCountry}
          onPhoneChange={updatePhoneNumber}
          selectedCountry={selectedCountry}
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
        disabled={!form.full_name.trim() || (!form.email.trim() && !localPhoneNumber.trim()) || !form.password || !form.confirm_password}
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
