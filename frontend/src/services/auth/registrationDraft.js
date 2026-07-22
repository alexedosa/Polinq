let registrationDraft = null

export function getRegistrationDraft() {
  if (!registrationDraft) {
    return null
  }

  return {
    form: { ...registrationDraft.form },
    localPhoneNumber: registrationDraft.localPhoneNumber,
    selectedCountry: registrationDraft.selectedCountry
      ? { ...registrationDraft.selectedCountry }
      : null,
  }
}

export function setRegistrationDraft({ form, localPhoneNumber, selectedCountry }) {
  registrationDraft = {
    form: { ...form },
    localPhoneNumber,
    selectedCountry: selectedCountry ? { ...selectedCountry } : null,
  }
}

export function clearRegistrationDraft() {
  registrationDraft = null
}
