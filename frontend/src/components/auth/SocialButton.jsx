const icons = {
  apple: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M16.56 12.9c-.03-2.18 1.78-3.23 1.86-3.28-1.02-1.49-2.59-1.69-3.14-1.71-1.32-.14-2.61.79-3.28.79-.69 0-1.72-.77-2.84-.75-1.45.02-2.81.86-3.56 2.17-1.54 2.67-.39 6.6 1.09 8.76.74 1.06 1.6 2.24 2.72 2.2 1.1-.04 1.51-.7 2.84-.7 1.32 0 1.71.7 2.86.68 1.18-.02 1.93-1.06 2.64-2.13.86-1.21 1.2-2.41 1.21-2.47-.03-.01-2.37-.91-2.4-3.56Zm-2.14-6.39c.6-.75 1-1.76.89-2.79-.87.04-1.96.6-2.58 1.33-.56.65-1.06 1.7-.93 2.69.98.08 2-.49 2.62-1.23Z"
      />
    </svg>
  ),
  google: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.22c0-.77-.07-1.5-.2-2.22H12v4.21h5.38a4.61 4.61 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.52Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.26l-3.23-2.51c-.9.6-2.05.95-3.39.95-2.6 0-4.81-1.75-5.6-4.11H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 14.07a6 6 0 0 1 0-3.82V7.66H3.07a10.02 10.02 0 0 0 0 8.99l3.33-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.14c1.47 0 2.78.5 3.82 1.49l2.86-2.86A9.61 9.61 0 0 0 12 2a9.99 9.99 0 0 0-8.93 5.66l3.33 2.59c.79-2.36 3-4.11 5.6-4.11Z"
      />
    </svg>
  ),
}

export function SocialButton({ provider }) {
  const label = provider === 'apple' ? 'Continue with Apple' : 'Continue with Google'

  return (
    <button
      aria-disabled="true"
      className="social-button"
      disabled
      type="button"
      onClick={() => undefined}
      aria-label={`${label}. OAuth is not available yet.`}
    >
      {icons[provider]}
      <span>{label}</span>
    </button>
  )
}
