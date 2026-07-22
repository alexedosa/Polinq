import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/logo/polinq-logo-black.svg'
import { navigateTo } from '../../lib/navigation.js'
import {
  completeProductOnboarding,
  setAuthenticationTransitionCover,
} from '../../services/onboarding/productOnboarding.js'
import { useAuth } from '../auth/useAuth.js'

const steps = [
  {
    body: 'Find help, opportunities and meaningful connections around you.',
    eyebrow: 'Nearby people',
    title: 'Nearby people.\nReal solutions.',
    visual: 'promise',
  },
  {
    body: 'Turn a need, opportunity or idea into a Linq that nearby people can discover.',
    eyebrow: 'Real opportunities',
    title: 'One Linq.\nReal possibilities.',
    visual: 'linq',
  },
  {
    body: 'Polinq helps nearby people discover each other with confidence.',
    eyebrow: 'Meaningful connections',
    title: 'Built for real connections.',
    visual: 'trust',
  },
]

const exampleLinqs = [
  {
    category: 'Service',
    distance: '400m away',
    request: 'Need a laptop screen repaired today.',
  },
  {
    category: 'Hiring',
    distance: '1.2km away',
    request: 'Looking for a photographer for a small shop launch.',
  },
  {
    category: 'Marketplace',
    distance: '650m away',
    request: 'Selling a barely used standing desk this weekend.',
  },
]

const primaryActionLabels = [
  'Get Started',
  'Continue',
  'Enter Polinq',
]

export function ProductOnboarding() {
  const { isAuthenticated, profile, user } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const primaryActionRef = useRef(null)
  const step = steps[activeStep]
  const isFinalStep = activeStep === steps.length - 1
  const productOnboardingSubjectId = profile?.user_id || user?.id

  useEffect(() => {
    primaryActionRef.current?.focus()
  }, [activeStep])

  function enterAuthentication() {
    if (isExiting) {
      return
    }

    completeProductOnboarding(isAuthenticated ? productOnboardingSubjectId : undefined)
    setIsExiting(true)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => {
      if (!prefersReducedMotion && !isAuthenticated) {
        setAuthenticationTransitionCover()
      }
      navigateTo(isAuthenticated ? '/onboarding/username' : '/login', { replace: true })
    }, prefersReducedMotion ? 1 : 900)
  }

  function handlePrimaryAction() {
    if (isFinalStep) {
      enterAuthentication()
      return
    }

    setActiveStep((current) => current + 1)
  }

  function skipOnboarding() {
    completeProductOnboarding(isAuthenticated ? productOnboardingSubjectId : undefined)
    navigateTo(isAuthenticated ? '/onboarding/username' : '/login', { replace: true })
  }

  return (
    <main
      aria-labelledby="product-onboarding-title"
      className={`product-onboarding-shell${isExiting ? ' product-onboarding-shell--exiting' : ''}`}
    >
      <div className="product-onboarding-transition" aria-hidden="true">
        <span className="product-onboarding-transition__logo">
          <img src={logo} alt="" />
        </span>
        <span className="product-onboarding-transition__circle" />
      </div>

      <section className="product-onboarding-content">
        <div className="product-onboarding-copy">
          <p className="product-onboarding-eyebrow">{step.eyebrow}</p>
          <h1 id="product-onboarding-title">{step.title}</h1>
          <p>{step.body}</p>
        </div>

        <ProductOnboardingVisual type={step.visual} />

        <div className="product-onboarding-controls" aria-label="Product onboarding progress">
          <div className="product-onboarding-dots" aria-hidden="true">
            {steps.map((item, index) => (
              <span
                className={`product-onboarding-dot${index === activeStep ? ' product-onboarding-dot--active' : ''}`}
                key={item.title}
              />
            ))}
          </div>
          <p className="sr-only">Step {activeStep + 1} of {steps.length}</p>
        </div>

        <div className="product-onboarding-actions">
          <button
            className="button button--primary product-onboarding-primary"
            onClick={handlePrimaryAction}
            ref={primaryActionRef}
            type="button"
          >
            {primaryActionLabels[activeStep]}
          </button>
          {!isFinalStep ? (
            <button className="text-link product-onboarding-skip" onClick={skipOnboarding} type="button">
              Skip
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function ProductOnboardingVisual({ type }) {
  if (type === 'linq') {
    return (
      <div className="product-onboarding-visual" aria-hidden="true">
        <div className="product-linq-marquee">
          <div className="product-linq-marquee__track">
            {[...exampleLinqs, ...exampleLinqs].map((linq, index) => (
              <article className="product-linq-card" key={`${linq.category}-${index}`}>
                <span className="product-linq-card__category">{linq.category}</span>
                <p>{linq.request}</p>
                <small>{linq.distance}</small>
              </article>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'trust') {
    return (
      <div className="product-onboarding-visual product-onboarding-visual--trust" aria-hidden="true">
        <p>No noise. Just people who can actually help.</p>
      </div>
    )
  }

  return (
    <div className="product-onboarding-visual product-onboarding-visual--logo" aria-hidden="true">
      <svg className="product-onboarding-logo-mark" viewBox="0 0 240 180" focusable="false">
        <path
          d="M77 88c-19 0-34-15-34-34s15-34 34-34h43c19 0 34 15 34 34s-15 34-34 34H77Z"
        />
        <path
          d="M120 88H77c-19 0-34 15-34 34s15 34 34 34h43c19 0 34-15 34-34s-15-34-34-34Z"
        />
        <path
          d="M120 88h43c19 0 34-15 34-34s-15-34-34-34h-43c-19 0-34 15-34 34s15 34 34 34Z"
        />
        <path
          d="M120 88h43c19 0 34 15 34 34s-15 34-34 34h-43c-19 0-34-15-34-34s15-34 34-34Z"
        />
        <path
          className="product-onboarding-logo-mark__accent"
          d="M120 88h26"
        />
      </svg>
    </div>
  )
}
