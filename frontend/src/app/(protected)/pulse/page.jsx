import { getDashboardTitle } from '../../../lib/dashboardNavigation.js'

export function DashboardPlaceholderPage({ path = '/pulse' }) {
  const title = getDashboardTitle(path)

  return (
    <section className="dashboard-placeholder" aria-labelledby="app-workspace-title">
      <h2 id="app-workspace-title">{title}</h2>
      <p>{title} is ready for the next Polinq workspace module.</p>
    </section>
  )
}

export function PulsePage() {
  return <DashboardPlaceholderPage path="/pulse" />
}
