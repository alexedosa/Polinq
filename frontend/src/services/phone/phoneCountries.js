import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

const priorityCountries = new Set(['NG', 'GB', 'US', 'CA', 'GH', 'ZA', 'KE'])
const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })

function countryName(countryCode) {
  return displayNames.of(countryCode) || countryCode
}

export const PHONE_COUNTRIES = getCountries()
  .map((isoCode) => ({
    callingCode: `+${getCountryCallingCode(isoCode)}`,
    displayCode: isoCode === 'GB' ? 'UK' : isoCode,
    isoCode,
    name: countryName(isoCode),
  }))
  .sort((first, second) => {
    const firstPriority = priorityCountries.has(first.isoCode) ? 0 : 1
    const secondPriority = priorityCountries.has(second.isoCode) ? 0 : 1

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority
    }

    return first.name.localeCompare(second.name)
  })

export const DEFAULT_PHONE_COUNTRY =
  PHONE_COUNTRIES.find((country) => country.isoCode === 'NG') || PHONE_COUNTRIES[0]
