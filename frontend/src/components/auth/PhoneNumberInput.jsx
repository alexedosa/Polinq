import { useEffect, useMemo, useRef, useState } from 'react'
import { PHONE_COUNTRIES } from '../../services/phone/phoneCountries.js'

function countryLabel(country) {
  return `${country.name} ${country.displayCode} ${country.callingCode}`
}

export function PhoneNumberInput({
  disabled = false,
  error,
  localPhoneNumber,
  onCountryChange,
  onPhoneChange,
  selectedCountry,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const errorId = error ? 'phone_number-error' : undefined

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return PHONE_COUNTRIES
    }

    return PHONE_COUNTRIES.filter((country) => (
      country.name.toLowerCase().includes(normalizedQuery)
      || country.displayCode.toLowerCase().includes(normalizedQuery)
      || country.isoCode.toLowerCase().includes(normalizedQuery)
      || country.callingCode.includes(normalizedQuery)
    ))
  }, [query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function selectCountry(country) {
    onCountryChange(country)
    setIsOpen(false)
    setQuery('')
    buttonRef.current?.focus()
  }

  function handleListKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      buttonRef.current?.focus()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, filteredCountries.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter' && filteredCountries[activeIndex]) {
      event.preventDefault()
      selectCountry(filteredCountries[activeIndex])
    }
  }

  return (
    <div className="field phone-field" ref={rootRef}>
      <label htmlFor="phone_number">Phone number</label>
      <div className="phone-input-row">
        <button
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`Country calling code, ${countryLabel(selectedCountry)}`}
          className="country-select-button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          ref={buttonRef}
          type="button"
        >
          <span className="country-select-button__name">{selectedCountry.name}</span>
          <span className="country-select-button__code">{selectedCountry.displayCode}</span>
          <span className="country-select-button__dial">{selectedCountry.callingCode}</span>
          <span aria-hidden="true" className="country-select-button__chevron">v</span>
        </button>
        <input
          aria-describedby={errorId}
          aria-invalid={error ? 'true' : 'false'}
          autoComplete="tel"
          disabled={disabled}
          id="phone_number"
          inputMode="tel"
          name="phone_number"
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="801 234 5678"
          type="tel"
          value={localPhoneNumber}
        />
      </div>
      {isOpen ? (
        <div className="country-select-popover" onKeyDown={handleListKeyDown}>
          <label className="sr-only" htmlFor="country-search">Search countries</label>
          <input
            autoComplete="off"
            autoFocus
            className="country-search-input"
            id="country-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search country or code"
            type="search"
            value={query}
          />
          <div className="country-option-list" role="listbox" aria-label="Country calling codes">
            {filteredCountries.map((country, index) => (
              <button
                aria-selected={country.isoCode === selectedCountry.isoCode}
                className={`country-option${index === activeIndex ? ' country-option--active' : ''}`}
                key={country.isoCode}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectCountry(country)}
                role="option"
                type="button"
              >
                <span className="country-option__name">{country.name}</span>
                <span className="country-option__iso">{country.displayCode}</span>
                <span className="country-option__dial">{country.callingCode}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
