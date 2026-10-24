import { CalendarDays, Home, ListChecks, Target, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { LogoMark } from '../design-system/Logo';
import { QuickAdd } from '../features/projects/QuickAdd';
import { useI18n, type MessageKey } from '../i18n';
import { ROUTES } from './paths';

const TABS: { to: string; icon: LucideIcon; label: MessageKey }[] = [
  { to: ROUTES.home, icon: Home, label: 'nav.home' },
  { to: ROUTES.projects, icon: Target, label: 'nav.projects' },
  { to: ROUTES.planning, icon: CalendarDays, label: 'nav.planning' },
  { to: ROUTES.tracking, icon: ListChecks, label: 'nav.tracking' },
  { to: ROUTES.finance, icon: Wallet, label: 'nav.finance' },
];

/** Coque : contenu de l'écran + 5 onglets (en bas sur téléphone, sur le côté sur ordinateur). */
export function AppShell() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  // Chaque changement d'écran repart du haut de la page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="p-shell">
      <main className="p-shell__main" id="contenu">
        <Outlet />
      </main>
      <nav className="p-nav" aria-label={t('nav.label')}>
        <div className="p-nav__brand">
          <LogoMark size={32} />
          <span>PISTIS</span>
        </div>
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === ROUTES.home} className="p-nav__item">
            <Icon aria-hidden="true" />
            <span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>
      <QuickAdd />
    </div>
  );
}
