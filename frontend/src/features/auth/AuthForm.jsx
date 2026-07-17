export function AuthForm({ children, className = '', onSubmit }) {
  return (
    <form
      className={`auth-form ${className}`.trim()}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(event)
      }}
    >
      {children}
    </form>
  )
}
