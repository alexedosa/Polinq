import { useState } from 'react'

export function PasswordInput({
  autoComplete,
  disabled = false,
  error,
  label,
  name,
  onChange,
  placeholder = 'Enter password',
  value,
}) {
  const [visible, setVisible] = useState(false)
  const errorId = error ? `${name}-error` : undefined

  return (
    <label className="field" htmlFor={name}>
      <span>{label}</span>
      <span className="password-shell">
        <input
          aria-describedby={errorId}
          aria-invalid={error ? 'true' : 'false'}
          autoComplete={autoComplete}
          disabled={disabled}
          id={name}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          disabled={disabled}
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {error ? (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
