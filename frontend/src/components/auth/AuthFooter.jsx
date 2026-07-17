import { AppLink } from '../routing/AppLink.jsx'

export function AuthFooter({ actionLabel, prompt, to }) {
  return (
    <p className="auth-footer">
      {prompt}{' '}
      <AppLink className="text-link" to={to}>
        {actionLabel}
      </AppLink>
    </p>
  )
}
