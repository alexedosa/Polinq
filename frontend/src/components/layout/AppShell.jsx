import { useState } from 'react'
import {
  Activity,
  Add,
  ArrowLeft2,
  BookSaved,
  Briefcase,
  Discover,
  DocumentText,
  Logout,
  MessageQuestion,
  MessageText,
  Moon,
  Notification,
  Profile,
  SearchNormal1,
  Sun1,
} from 'iconsax-reactjs'
import { AppLink } from '../routing/AppLink.jsx'
import { useAuth } from '../../features/auth/useAuth.js'
import shellLogo from '../../assets/logo/polinq-logo-black.svg'
import {
  dashboardRoutes,
  getDashboardTitle,
  hasProfessionalPreview,
  professionalRoute,
} from '../../lib/dashboardNavigation.js'

const mobileRoutes = [
  dashboardRoutes[0],
  dashboardRoutes[1],
  { icon: 'create', path: '/my-linqs', title: 'Create Linq' },
  dashboardRoutes[2],
  dashboardRoutes[5],
]

const shellIcons = {
  collapse: ArrowLeft2,
  create: Add,
  discover: Discover,
  expand: ArrowLeft2,
  help: MessageQuestion,
  linqs: DocumentText,
  logout: Logout,
  messages: MessageText,
  notifications: Notification,
  professional: Briefcase,
  profile: Profile,
  pulse: Activity,
  saved: BookSaved,
  search: SearchNormal1,
  support: MessageQuestion,
  theme: Sun1,
  'theme-moon': Moon,
}

function Icon({ name }) {
  const IconComponent = shellIcons[name] || Activity

  return <IconComponent aria-hidden="true" className="app-shell-icon" color="currentColor" size="16" variant="Linear" />
}

function DashboardNavLink({ isActive, route }) {
  return (
    <AppLink
      aria-current={isActive ? 'page' : undefined}
      className={`app-sidebar-link${isActive ? ' app-sidebar-link--active' : ''}`}
      to={route.path}
    >
      <Icon name={route.icon} />
      <span>{route.title}</span>
    </AppLink>
  )
}

function Sidebar({ currentPath, isCollapsed, onToggleCollapse, onThemeChange, theme }) {
  const { isDemoSession, profile, signOut } = useAuth()
  const routes = hasProfessionalPreview(profile, isDemoSession)
    ? [...dashboardRoutes, professionalRoute]
    : dashboardRoutes

  return (
    <aside className={`app-sidebar${isCollapsed ? ' app-sidebar--collapsed' : ''}`} aria-label="Primary">
      <div className="app-sidebar-top">
        <div className="app-sidebar-logo">
          <button
            aria-label={isCollapsed ? 'Expand sidebar' : 'Polinq'}
            className="app-sidebar-brand"
            onClick={() => {
              if (isCollapsed) {
                onToggleCollapse()
              }
            }}
            type="button"
          >
            <img className="app-sidebar-brand__mark" src={shellLogo} alt="" />
            <span className="app-sidebar-brand__text">Polinq</span>
          </button>
          <button
            aria-label="Collapse sidebar"
            className="app-sidebar-minimize"
            onClick={onToggleCollapse}
            type="button"
          >
            <Icon name="collapse" />
          </button>
        </div>
        <nav className="app-sidebar-nav" aria-label="Dashboard">
          {routes.map((route) => (
            <DashboardNavLink
              isActive={currentPath === route.path}
              key={route.path}
              route={route}
            />
          ))}
        </nav>
      </div>
      <div className="app-sidebar-utilities" aria-label="Utilities">
        <div className="app-theme-utility" aria-label="Theme options">
          <button
            aria-label="Dark theme"
            aria-pressed={theme === 'dark'}
            className={`app-theme-button${theme === 'dark' ? ' app-theme-button--active' : ''}`}
            onClick={() => onThemeChange('dark')}
            title="Dark theme"
            type="button"
          >
            <Icon name="theme-moon" />
          </button>
          <button
            aria-label="Light theme"
            aria-pressed={theme === 'light'}
            className={`app-theme-button${theme === 'light' ? ' app-theme-button--active' : ''}`}
            onClick={() => onThemeChange('light')}
            title="Light theme"
            type="button"
          >
            <Icon name="theme" />
          </button>
        </div>
        <button
          aria-label="Support"
          className="app-utility-button app-utility-button--support"
          title="Support"
          type="button"
        >
          <Icon name="support" />
        </button>
        <button
          aria-label="Logout"
          className="app-utility-button app-utility-button--logout"
          onClick={signOut}
          title="Logout"
          type="button"
        >
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  )
}

function Topbar({ currentPath }) {
  const { profile, user } = useAuth()
  const title = getDashboardTitle(currentPath)
  const displayName = profile?.display_name || user?.full_name || user?.username || 'Polinq'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'P'

  return (
    <header className="app-topbar">
      <h1>{title}</h1>
      <div className="app-topbar-actions">
        <label className="app-search">
          <span className="sr-only">Search</span>
          <Icon name="search" />
          <input placeholder="Search Polinq" type="search" />
        </label>
        <button className="app-new-linq-button" type="button">
          <Icon name="create" />
          New Linq
        </button>
        <button className="app-icon-button" aria-label="Notifications" type="button">
          <Icon name="notifications" />
        </button>
        <AppLink className="app-icon-button" aria-label="Messages" to="/messages">
          <Icon name="messages" />
        </AppLink>
        <AppLink className="app-avatar-button" aria-label="Profile" to="/profile">
          {initials}
        </AppLink>
      </div>
    </header>
  )
}

function MobileNav({ currentPath }) {
  return (
    <nav className="app-mobile-nav" aria-label="Primary mobile">
      {mobileRoutes.map((route) => (
        <AppLink
          aria-current={currentPath === route.path ? 'page' : undefined}
          className={`app-mobile-link${currentPath === route.path ? ' app-mobile-link--active' : ''}`}
          key={route.title}
          to={route.path}
        >
          <Icon name={route.icon} />
          <span>{route.title}</span>
        </AppLink>
      ))}
    </nav>
  )
}

function Workspace({ children, currentPath }) {
  return (
    <main className="app-workspace" aria-labelledby="app-workspace-title">
      {children}
      <div className="app-workspace-fade" aria-hidden="true" />
      <MobileNav currentPath={currentPath} />
    </main>
  )
}

export function AppShell({ children, currentPath }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState('light')

  return (
    <div className={`app-shell-page app-shell-page--${theme}`}>
      <div className={`app-shell-frame${isSidebarCollapsed ? ' app-shell-frame--sidebar-collapsed' : ''}`}>
        <Sidebar
          currentPath={currentPath}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          onThemeChange={setTheme}
          theme={theme}
        />
        <section className="app-main-panel">
          <Topbar currentPath={currentPath} />
          <Workspace currentPath={currentPath}>{children}</Workspace>
        </section>
      </div>
    </div>
  )
}
