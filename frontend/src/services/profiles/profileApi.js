import { apiRequest } from '../api/client.js'

export async function getMyProfile() {
  const response = await apiRequest('/profiles/me/', {
    method: 'GET',
  })
  return response.data.profile
}

export async function updateMyProfile(payload) {
  const response = await apiRequest('/profiles/me/', {
    body: payload,
    method: 'PATCH',
  })
  return response.data.profile
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData()
  formData.append('profile_photo', file)

  const response = await apiRequest('/profiles/me/', {
    body: formData,
    method: 'PATCH',
  })
  return response.data.profile
}

export async function checkUsernameAvailability(username) {
  const query = new URLSearchParams({ username })
  const response = await apiRequest(`/profiles/username-availability/?${query.toString()}`, {
    auth: false,
    method: 'GET',
  })
  return response.data
}
