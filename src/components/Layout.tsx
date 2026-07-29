import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import styles from './Layout.module.css';

type NavItem = { to: string; label: string; end?: boolean };

const NAV: readonly NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/writing', label: 'Writing' },
  { to: '/contact', label: 'Contact' },
];

export function Layout() {
  const { pathname } = useLocation();

  // Route changes should move focus and scroll like a real page load would.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>

      <header className={styles.header}>
        <NavLink to="/" className={styles.brand}>
          Rey&nbsp;Pogue
        </NavLink>

        <nav aria-label="Primary">
          <ul className={styles.navList}>
            {NAV.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Built with Vite, React and an unreasonable amount of goose anatomy research.
        </p>
      </footer>
    </div>
  );
}
