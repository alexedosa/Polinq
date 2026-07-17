export function Button({
  as: Component = 'button',
  children,
  className = '',
  disabled = false,
  isLoading = false,
  variant = 'primary',
  type = 'button',
  ...props
}) {
  const classes = `button button--${variant} ${className}`.trim()
  const content = isLoading ? 'Please wait...' : children

  if (Component === 'button') {
    return (
      <button aria-busy={isLoading ? 'true' : 'false'} className={classes} disabled={disabled || isLoading} type={type} {...props}>
        {content}
      </button>
    )
  }

  return (
    <Component className={classes} {...props}>
      {content}
    </Component>
  )
}

export function PrimaryButton(props) {
  return <Button variant="primary" {...props} />
}

export function SecondaryButton(props) {
  return <Button variant="secondary" {...props} />
}
