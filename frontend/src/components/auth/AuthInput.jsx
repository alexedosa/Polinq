export function AuthInput({
  autoComplete,
  disabled = false,
  error,
  inputMode,
  label,
  maxLength,
  name,
  onChange,
  pattern,
  placeholder,
  type = 'text',
  value,
}) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <label className="field" htmlFor={name}>
      <span>{label}</span>
      <input
        aria-describedby={errorId}
        aria-invalid={error ? 'true' : 'false'}
        autoComplete={autoComplete}
        disabled={disabled}
        id={name}
        inputMode={inputMode}
        maxLength={maxLength}
        name={name}
        onChange={onChange}
        pattern={pattern}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  )
}
