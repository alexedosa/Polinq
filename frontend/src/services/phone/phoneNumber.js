import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function normalizeLocalPhoneNumber(localPhoneNumber, country) {
  const value = localPhoneNumber.trim()

  if (!value) {
    return ''
  }

  const parsed = parsePhoneNumberFromString(value, country?.isoCode)

  if (!parsed || !parsed.isValid()) {
    throw new Error(`Enter a valid phone number for ${country?.name || 'the selected country'}.`)
  }

  return parsed.number
}
