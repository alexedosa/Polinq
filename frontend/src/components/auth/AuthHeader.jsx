export function AuthHeader({ eyebrow, title, description }) {
  return (
    <header className="auth-header">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  )
}
