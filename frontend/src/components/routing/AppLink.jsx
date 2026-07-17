import { navigateTo } from '../../lib/navigation.js'

export function AppLink({ children, className, to, ...props }) {
  return (
    <a
      className={className}
      href={to}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return
        }
        event.preventDefault()
        navigateTo(to)
      }}
      {...props}
    >
      {children}
    </a>
  )
}
