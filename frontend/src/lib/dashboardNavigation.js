export const dashboardRoutes = [
  { path: '/pulse', title: 'Pulse', icon: 'pulse' },
  { path: '/discover', title: 'Discover', icon: 'discover' },
  { path: '/messages', title: 'Messages', icon: 'messages' },
  { path: '/saved', title: 'Saved', icon: 'saved' },
  { path: '/my-linqs', title: 'My Linqs', icon: 'linqs' },
  { path: '/profile', title: 'Profile', icon: 'profile' },
]

export const professionalRoute = {
  icon: 'professional',
  path: '/professional',
  title: 'Professional',
}

export const dashboardRouteTitles = Object.fromEntries(
  [...dashboardRoutes, professionalRoute].map((route) => [route.path, route.title]),
)

export function getDashboardTitle(path) {
  return dashboardRouteTitles[path] || 'Pulse'
}

export function hasProfessionalPreview(profile, isDemoSession) {
  return Boolean(isDemoSession && profile?.demo_professional_preview)
}
