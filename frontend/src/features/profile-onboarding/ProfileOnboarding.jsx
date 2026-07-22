import { useEffect, useRef, useState } from 'react'
import { Logo } from '../../components/branding/Logo.jsx'
import { ApiError, fieldMessage, formErrorMessage } from '../../services/api/errors.js'
import {
  checkUsernameAvailability,
  updateMyProfile,
  uploadProfilePhoto,
} from '../../services/profiles/profileApi.js'
import { navigateTo } from '../../lib/navigation.js'
import { useAuth } from '../auth/useAuth.js'

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30
const BIO_MAX_LENGTH = 500
const PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const RADIUS_MIN_KM = 1
const RADIUS_MAX_KM = 100
const DEFAULT_RADIUS_KM = 25

const stepOrder = ['username', 'profile', 'location', 'radius']

function isComplete(profile) {
  return profile?.onboarding_complete === true || profile?.onboarding_status === 'COMPLETED'
}

function missingRequirements(profile) {
  return Array.isArray(profile?.missing_onboarding_requirements)
    ? profile.missing_onboarding_requirements
    : []
}

function firstIncompleteStep(profile) {
  const missing = missingRequirements(profile)
  if (missing.includes('username')) {
    return 'username'
  }
  if (missing.includes('location')) {
    return 'location'
  }
  if (missing.includes('discovery_radius_km')) {
    return 'radius'
  }
  return 'radius'
}

function errorForField(error, ...fields) {
  return fields.map((field) => fieldMessage(error?.errors, field)).find(Boolean) || ''
}

function profileValue(value) {
  return value === null || value === undefined ? '' : String(value)
}

function stepIndex(stepId) {
  return stepOrder.indexOf(stepId)
}

export function ProfileOnboarding() {
  const { profile, refreshProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(null)
  const [serverProfile, setServerProfile] = useState(profile)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const headingRef = useRef(null)
  const submitLockRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function resolveProfile() {
      setError(null)
      try {
        const nextProfile = await refreshProfile()
        if (!mounted) {
          return
        }
        setServerProfile(nextProfile)
        if (isComplete(nextProfile)) {
          navigateTo('/pulse', { replace: true })
          return
        }
        setCurrentStep(firstIncompleteStep(nextProfile))
      } catch (nextError) {
        if (mounted) {
          setError(nextError)
        }
      }
    }

    resolveProfile()
    return () => {
      mounted = false
    }
  }, [refreshProfile])

  useEffect(() => {
    headingRef.current?.focus()
  }, [currentStep])

  useEffect(() => {
    if (!(error instanceof ApiError) || !error.errors || !Object.keys(error.errors).length) {
      return
    }

    const firstField = Object.keys(error.errors)[0]
    const fieldId = firstField === 'location' ? 'location_label' : firstField
    window.setTimeout(() => document.getElementById(fieldId)?.focus(), 0)
  }, [error])

  async function saveStep(payload, nextStep) {
    if (submitLockRef.current) {
      return null
    }

    submitLockRef.current = true
    setError(null)
    setStatusMessage('')
    setIsSubmitting(true)
    try {
      const updatedProfile = await updateMyProfile(payload)
      setServerProfile(updatedProfile)
      setStatusMessage('Saved.')

      if (nextStep) {
        setCurrentStep(nextStep)
      }
      return updatedProfile
    } catch (nextError) {
      setError(nextError)
      return null
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  async function completeFinalStep(payload) {
    const updatedProfile = await saveStep(payload, null)
    if (!updatedProfile) {
      return
    }

    setIsSubmitting(true)
    try {
      const confirmedProfile = await refreshProfile()
      setServerProfile(confirmedProfile)
      if (isComplete(confirmedProfile)) {
        navigateTo('/pulse', { replace: true })
        return
      }

      setCurrentStep(firstIncompleteStep(confirmedProfile))
      setError(new ApiError({
        code: 'PROFILE_ONBOARDING_INCOMPLETE',
        errors: {},
        message: 'Your profile still needs one more detail before Polinq can open.',
        status: 400,
      }))
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function goBack() {
    const index = stepIndex(currentStep)
    if (index > 0) {
      setError(null)
      setStatusMessage('')
      setCurrentStep(stepOrder[index - 1])
    }
  }

  if (!currentStep || !serverProfile) {
    return (
      <ProfileOnboardingLayout>
        <section className="profile-onboarding-loading" aria-live="polite">
          <Logo />
          <p>Preparing your profile setup.</p>
        </section>
      </ProfileOnboardingLayout>
    )
  }

  const CurrentStep = {
    username: UsernameStep,
    profile: ProfileDetailsStep,
    location: LocationStep,
    radius: RadiusStep,
  }[currentStep]

  return (
    <ProfileOnboardingLayout>
      <section className="profile-onboarding-panel" aria-labelledby="profile-onboarding-title">
        <OnboardingProgress currentStep={currentStep} profile={serverProfile} />
        {error && !Object.keys(error.errors || {}).length ? (
          <p className="form-status form-status--error" role="alert">{formErrorMessage(error)}</p>
        ) : null}
        {statusMessage ? <p className="profile-onboarding-status" role="status">{statusMessage}</p> : null}
        <CurrentStep
          error={error}
          headingRef={headingRef}
          isSubmitting={isSubmitting}
          onBack={goBack}
          onComplete={completeFinalStep}
          onSave={saveStep}
          profile={serverProfile}
          refreshProfile={refreshProfile}
          setError={setError}
          setServerProfile={setServerProfile}
          setStatusMessage={setStatusMessage}
        />
      </section>
    </ProfileOnboardingLayout>
  )
}

function ProfileOnboardingLayout({ children }) {
  return (
    <main className="profile-onboarding-shell">
      <header className="profile-onboarding-header">
        <Logo />
        <span>Profile setup</span>
      </header>
      <div className="profile-onboarding-canvas">
        <aside className="profile-onboarding-intro" aria-label="Profile setup context">
          <p className="eyebrow">Polinq profile</p>
          <p>Set up the details that help nearby people recognize who they are connecting with.</p>
        </aside>
        {children}
      </div>
    </main>
  )
}

function OnboardingProgress({ currentStep, profile }) {
  const currentIndex = stepIndex(currentStep)
  const missing = missingRequirements(profile)
  const completedCount = stepOrder.reduce((count, stepId) => {
    const complete = stepId === 'profile'
      ? Boolean(profile.bio || profile.profile_photo_url)
      : !missing.includes(stepId === 'radius' ? 'discovery_radius_km' : stepId)

    return count + (complete ? 1 : 0)
  }, 0)
  const progressValue = Math.max(completedCount, currentIndex + 1)
  const progressPercent = `${Math.min(progressValue, stepOrder.length) / stepOrder.length * 100}%`

  return (
    <div
      aria-label={`Step ${currentIndex + 1} of ${stepOrder.length}`}
      aria-valuemax={stepOrder.length}
      aria-valuemin="1"
      aria-valuenow={currentIndex + 1}
      className="profile-onboarding-progress"
      role="progressbar"
    >
      <span>Step {currentIndex + 1} of {stepOrder.length}</span>
      <span className="profile-onboarding-progress__track" aria-hidden="true">
        <span style={{ width: progressPercent }} />
      </span>
    </div>
  )
}

function StepHeader({ description, headingRef, title }) {
  return (
    <div className="profile-onboarding-step-header">
      <p className="eyebrow">Profile onboarding</p>
      <h1 id="profile-onboarding-title" ref={headingRef} tabIndex="-1">{title}</h1>
      <p>{description}</p>
    </div>
  )
}

function UsernameStep({ error, headingRef, isSubmitting, onBack, onSave, profile }) {
  const [username, setUsername] = useState(profileValue(profile.username))
  const [availability, setAvailability] = useState({ state: 'idle', message: '' })
  const requestIdRef = useRef(0)
  const usernameError = errorForField(error, 'username')
  const normalizedUsername = username.trim().toLowerCase()

  useEffect(() => {
    setUsername(profileValue(profile.username))
  }, [profile.username])

  useEffect(() => {
    if (!normalizedUsername || normalizedUsername === profile.username) {
      setAvailability({ state: 'idle', message: '' })
      return undefined
    }

    if (
      normalizedUsername.length < USERNAME_MIN_LENGTH
      || normalizedUsername.length > USERNAME_MAX_LENGTH
      || !/^[a-z0-9._]+$/.test(normalizedUsername)
      || !/^[a-z0-9].*[a-z0-9]$/.test(normalizedUsername)
      || /[._]{2}/.test(normalizedUsername)
    ) {
      setAvailability({ state: 'invalid', message: 'Use 3-30 lowercase letters, numbers, underscores, or periods.' })
      return undefined
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setAvailability({ state: 'checking', message: 'Checking username.' })

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(normalizedUsername)
        if (requestIdRef.current !== requestId) {
          return
        }
        setAvailability({
          state: result.available ? 'available' : 'unavailable',
          message: result.message,
        })
      } catch (nextError) {
        if (requestIdRef.current !== requestId) {
          return
        }
        setAvailability({
          state: nextError instanceof ApiError ? 'invalid' : 'network-error',
          message: nextError instanceof ApiError ? formErrorMessage(nextError) : 'Unable to check username.',
        })
      }
    }, 420)

    return () => window.clearTimeout(timer)
  }, [normalizedUsername, profile.username])

  function handleSubmit(event) {
    event.preventDefault()
    onSave({ username: normalizedUsername }, 'profile')
  }

  return (
    <form className="profile-onboarding-form" onSubmit={handleSubmit}>
      <StepHeader
        description="Your username is your public identity on Polinq. Choose a nice one 😁❤️"
        headingRef={headingRef}
        title="Choose your username."
      />
      <label className="field" htmlFor="username">
        <span>Username</span>
        <input
          aria-describedby="username-help username-status"
          aria-invalid={usernameError ? 'true' : 'false'}
          autoComplete="username"
          disabled={isSubmitting}
          id="username"
          maxLength={USERNAME_MAX_LENGTH}
          name="username"
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          placeholder="muzan"
          value={username}
        />
        <span className="profile-onboarding-help" id="username-help">
          3-30 characters. Lowercase letters, numbers, underscores, and periods. Must start and end with a letter or number.
        </span>
        <span className={`profile-onboarding-availability profile-onboarding-availability--${availability.state}`} id="username-status" role="status">
          {usernameError || availability.message}
        </span>
      </label>
      <StepActions
        canGoBack={false}
        disabled={!normalizedUsername || availability.state === 'checking' || availability.state === 'unavailable'}
        isSubmitting={isSubmitting}
        onBack={onBack}
        primaryLabel="Save and continue"
      />
    </form>
  )
}

function ProfileDetailsStep({
  error,
  headingRef,
  isSubmitting,
  onBack,
  onSave,
  profile,
  refreshProfile,
  setError,
  setServerProfile,
  setStatusMessage,
}) {
  const [bio, setBio] = useState(profileValue(profile.bio))
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const uploadLockRef = useRef(false)
  const photoError = errorForField(error, 'profile_photo')
  const bioError = errorForField(error, 'bio')

  useEffect(() => {
    setBio(profileValue(profile.bio))
  }, [profile.bio])

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [file])

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] || null
    setError(null)
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!PHOTO_ACCEPT.split(',').includes(nextFile.type) || nextFile.size > PHOTO_MAX_SIZE_BYTES) {
      setFile(null)
      setError(new ApiError({
        code: nextFile.size > PHOTO_MAX_SIZE_BYTES ? 'PROFILE_PHOTO_TOO_LARGE' : 'PROFILE_PHOTO_INVALID',
        errors: {
          profile_photo: [
            nextFile.size > PHOTO_MAX_SIZE_BYTES
              ? 'Profile photo is too large.'
              : 'Profile photo must be a JPEG, PNG, WebP, or GIF image.',
          ],
        },
        message: 'Please correct the highlighted fields.',
        status: 400,
      }))
      return
    }
    setFile(nextFile)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting || isUploading || uploadLockRef.current) {
      return
    }

    uploadLockRef.current = true
    setError(null)
    setStatusMessage('')
    try {
      let updatedProfile = profile
      if (file) {
        setIsUploading(true)
        updatedProfile = await uploadProfilePhoto(file)
        setServerProfile(updatedProfile)
      }
      updatedProfile = await onSave({ bio }, 'location') || updatedProfile
      setFile(null)
      setServerProfile(updatedProfile)
    } catch (nextError) {
      setError(nextError)
    } finally {
      uploadLockRef.current = false
      setIsUploading(false)
    }
  }

  async function skipStep() {
    setError(null)
    const nextProfile = await refreshProfile()
    setServerProfile(nextProfile)
    setStatusMessage('')
    onSave({}, 'location')
  }

  return (
    <form className="profile-onboarding-form profile-onboarding-form--profile" onSubmit={handleSubmit}>
      <StepHeader
        description="Photo and bio are optional, but they help people understand who they are connecting with."
        headingRef={headingRef}
        title="Add a little context."
      />
      <div className="profile-photo-control">
        <div className="profile-photo-preview" aria-label="Profile photo preview">
          {previewUrl || profile.profile_photo_url ? (
            <img src={previewUrl || profile.profile_photo_url} alt="" />
          ) : (
            <span>{profile.display_name?.charAt(0) || 'P'}</span>
          )}
        </div>
        <label className="button button--secondary profile-photo-button" htmlFor="profile_photo">
          Choose photo
          <input
            accept={PHOTO_ACCEPT}
            disabled={isSubmitting || isUploading}
            id="profile_photo"
            name="profile_photo"
            onChange={handleFileChange}
            type="file"
          />
        </label>
        {photoError ? <span className="field-error" role="alert">{photoError}</span> : null}
        <p className="profile-onboarding-help">JPEG, PNG, WebP, or GIF. Maximum 5 MB.</p>
      </div>
      <label className="field" htmlFor="bio">
        <span>Bio</span>
        <textarea
          aria-invalid={bioError ? 'true' : 'false'}
          disabled={isSubmitting || isUploading}
          id="bio"
          maxLength={BIO_MAX_LENGTH}
          name="bio"
          onChange={(event) => setBio(event.target.value)}
          placeholder="A short introduction"
          value={bio}
        />
        {bioError ? <span className="field-error" role="alert">{bioError}</span> : null}
        <span className="profile-onboarding-help">{bio.length}/{BIO_MAX_LENGTH}</span>
      </label>
      <StepActions
        isSubmitting={isSubmitting || isUploading}
        onBack={onBack}
        onSkip={skipStep}
        primaryLabel={isUploading ? 'Uploading...' : 'Save and continue'}
        skipLabel="Skip for now"
      />
    </form>
  )
}

function LocationStep({ error, headingRef, isSubmitting, onBack, onSave, profile, setError }) {
  const [locationLabel, setLocationLabel] = useState(profileValue(profile.location_label))
  const [latitude, setLatitude] = useState(profileValue(profile.latitude))
  const [longitude, setLongitude] = useState(profileValue(profile.longitude))
  const [geoState, setGeoState] = useState('')
  const locationError = errorForField(error, 'location', 'location_label', 'latitude', 'longitude')

  useEffect(() => {
    setLocationLabel(profileValue(profile.location_label))
    setLatitude(profileValue(profile.latitude))
    setLongitude(profileValue(profile.longitude))
  }, [profile.location_label, profile.latitude, profile.longitude])

  function useCurrentLocation() {
    setError(null)
    if (!navigator.geolocation) {
      setGeoState('Your browser does not support location lookup. Enter your location manually.')
      return
    }

    setGeoState('Requesting location. Polinq uses this for nearby discovery and does not show exact coordinates publicly.')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setGeoState(
          position.coords.accuracy > 1000
            ? 'Location found, but accuracy is low. You can still adjust the details manually.'
            : 'Location found. Add a readable area label before continuing.',
        )
      },
      (geoError) => {
        const messages = {
          1: 'Location permission was denied. Enter your location manually.',
          2: 'Your location is unavailable right now. Enter it manually.',
          3: 'Location lookup timed out. Enter it manually or try again.',
        }
        setGeoState(messages[geoError.code] || 'Unable to get your location. Enter it manually.')
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave({
      latitude,
      location_label: locationLabel,
      longitude,
    }, 'radius')
  }

  return (
    <form className="profile-onboarding-form" onSubmit={handleSubmit}>
      <StepHeader
        description="Polinq uses your local area to make discovery relevant. Public profiles do not expose exact coordinates."
        headingRef={headingRef}
        title="Set your local area."
      />
      {locationError ? <p className="form-status form-status--error" role="alert">{locationError}</p> : null}
      <label className="field" htmlFor="location_label">
        <span>Location label</span>
        <input
          autoComplete="address-level2"
          disabled={isSubmitting}
          id="location_label"
          maxLength={255}
          name="location_label"
          onChange={(event) => setLocationLabel(event.target.value)}
          placeholder="Lagos, Nigeria"
          value={locationLabel}
        />
      </label>
      <div className="profile-onboarding-grid">
        <label className="field" htmlFor="latitude">
          <span>Latitude</span>
          <input
            disabled={isSubmitting}
            id="latitude"
            inputMode="decimal"
            name="latitude"
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="6.524379"
            value={latitude}
          />
        </label>
        <label className="field" htmlFor="longitude">
          <span>Longitude</span>
          <input
            disabled={isSubmitting}
            id="longitude"
            inputMode="decimal"
            name="longitude"
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="3.379206"
            value={longitude}
          />
        </label>
      </div>
      <button className="button button--secondary" disabled={isSubmitting} onClick={useCurrentLocation} type="button">
        Use my current location
      </button>
      {geoState ? <p className="profile-onboarding-help" role="status">{geoState}</p> : null}
      <StepActions
        disabled={!locationLabel.trim() || !latitude.trim() || !longitude.trim()}
        isSubmitting={isSubmitting}
        onBack={onBack}
        primaryLabel="Save and continue"
      />
    </form>
  )
}

function RadiusStep({ error, headingRef, isSubmitting, onBack, onComplete, profile }) {
  const [radius, setRadius] = useState(profileValue(profile.discovery_radius_km || DEFAULT_RADIUS_KM))
  const radiusError = errorForField(error, 'discovery_radius_km')

  useEffect(() => {
    setRadius(profileValue(profile.discovery_radius_km || DEFAULT_RADIUS_KM))
  }, [profile.discovery_radius_km])

  function handleSubmit(event) {
    event.preventDefault()
    onComplete({ discovery_radius_km: radius })
  }

  return (
    <form className="profile-onboarding-form" onSubmit={handleSubmit}>
      <StepHeader
        description="Your discovery radius controls how close nearby opportunities and professionals should be."
        headingRef={headingRef}
        title="Choose your discovery radius."
      />
      <label className="field" htmlFor="discovery_radius_km">
        <span>Discovery radius</span>
        <input
          aria-describedby="radius-help"
          aria-invalid={radiusError ? 'true' : 'false'}
          disabled={isSubmitting}
          id="discovery_radius_km"
          inputMode="numeric"
          max={RADIUS_MAX_KM}
          min={RADIUS_MIN_KM}
          name="discovery_radius_km"
          onChange={(event) => setRadius(event.target.value.replace(/\D/g, ''))}
          type="number"
          value={radius}
        />
        {radiusError ? <span className="field-error" role="alert">{radiusError}</span> : null}
        <span className="profile-onboarding-help" id="radius-help">
          Kilometres. Our-supported range: {RADIUS_MIN_KM}-{RADIUS_MAX_KM} km.
        </span>
      </label>
      <div className="profile-radius-readout" aria-live="polite">
        <strong>{radius || 0} km</strong>
        <span>Nearby discovery range</span>
      </div>
      <StepActions
        disabled={!radius || Number(radius) < RADIUS_MIN_KM || Number(radius) > RADIUS_MAX_KM}
        isSubmitting={isSubmitting}
        onBack={onBack}
        primaryLabel="Complete profile"
      />
    </form>
  )
}

function StepActions({
  canGoBack = true,
  disabled = false,
  isSubmitting,
  onBack,
  onSkip,
  primaryLabel,
  skipLabel,
}) {
  return (
    <div className="profile-onboarding-actions">
      <button className="button button--primary" disabled={disabled || isSubmitting} type="submit">
        {isSubmitting ? 'Saving...' : primaryLabel}
      </button>
      <div className="profile-onboarding-secondary-actions">
        {canGoBack ? (
          <button className="text-link auth-inline-action" disabled={isSubmitting} onClick={onBack} type="button">
            Back
          </button>
        ) : null}
        {onSkip ? (
          <button className="text-link auth-inline-action" disabled={isSubmitting} onClick={onSkip} type="button">
            {skipLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
