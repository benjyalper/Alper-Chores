import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useOnline, useInstallPrompt } from '../hooks/usePwa';

const NAV = [
  { to: '/', key: 'nav_schedule', icon: '🗓️', end: true },
  { to: '/family', key: 'nav_members', icon: '👨‍👩‍👧‍👦', end: false },
  { to: '/chores', key: 'nav_chores', icon: '✅', end: false },
  { to: '/settings', key: 'nav_settings', icon: '⚙️', end: false },
];

export function Layout() {
  const { t, code, toggle } = useI18n();
  const online = useOnline();
  const { canInstall, install, dismiss } = useInstallPrompt();
  // Show the language you would switch TO.
  const otherLangLabel = code === 'he' ? 'EN' : 'עברית';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <img src="/icons/icon-192.png" alt="" className="topbar__logo" width={28} height={28} />
          <span>{t('appName')}</span>
        </div>
        <div className="topbar__right">
          <nav className="topbar__nav" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' nav-link--active' : ''}`
                }
              >
                <span aria-hidden="true">{n.icon}</span>
                <span>{t(n.key)}</span>
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="btn btn--ghost btn--sm lang-toggle"
            onClick={toggle}
            aria-label={t('switch_language')}
            title={t('switch_language')}
          >
            <span aria-hidden="true">🌐</span> {otherLangLabel}
          </button>
        </div>
      </header>

      {!online && (
        <div className="banner banner--offline" role="status">
          ⚠ {t('offline')}
        </div>
      )}

      {canInstall && (
        <div className="banner banner--install" role="region" aria-label="Install app">
          <span>📲 {t('install_hint')}</span>
          <span className="banner__actions">
            <button className="btn btn--sm btn--primary" onClick={install}>
              {t('install')}
            </button>
            <button className="btn btn--sm btn--ghost" onClick={dismiss}>
              {t('dismiss')}
            </button>
          </span>
        </div>
      )}

      <main className="app-main">
        <Outlet />
      </main>

      {/* Bottom nav for mobile */}
      <nav className="bottom-nav" aria-label="Primary mobile">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
            }
          >
            <span aria-hidden="true" className="bottom-nav__icon">
              {n.icon}
            </span>
            <span className="bottom-nav__label">{t(n.key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
