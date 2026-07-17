import { AppLink } from '../routing/AppLink.jsx'

export function Logo({ size = 'default' }) {
  return (
    <AppLink className={`logo-mark logo-mark--${size}`} to="/" aria-label="Polinq home">
      Polinq
    </AppLink>
  )
}
