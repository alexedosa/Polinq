import { AppLink } from '../routing/AppLink.jsx'
import logo from '../../assets/logo/polinq-logo-white.svg'

export function Logo({ darkLogo, lightLogo, size = 'default' }) {
  const logoAsset = lightLogo || darkLogo || logo

  return (
    <AppLink className={`logo-mark logo-mark--${size}`} to="/" aria-label="Polinq home">
      <img className="logo-mark__image" src={logoAsset} alt="Polinq" />
    </AppLink>
  )
}
