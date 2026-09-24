import { BookOpen, Menu, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import AppLogo from '~/components/AppLogo';
import KnowledgeBaseSearch from '~/components/KnowledgeBaseSearch';
import { Button } from '~/components/ui/button';
import useKnowledgeBaseNavigation from '~/hooks/useKnowledgeBaseNavigation';
import { cn } from '~/lib/utils';
import { DASHBOARD } from '~/router/paths';
import UserNotificationsButton from './Notifications';
import UserMenu from './UserMenu';

interface NavbarProps {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  /** Customer shell: logo in the top bar (no sidebar). */
  customer?: boolean;
}

export default function Navbar({
  showMenuButton = false,
  onMenuClick,
  customer = false,
}: NavbarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openKnowledgeBase } = useKnowledgeBaseNavigation();

  return (
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        {showMenuButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onMenuClick}
            aria-label={t('navbar.openMenu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {customer ? (
          <>
            <Link
              to={DASHBOARD}
              className="shrink-0"
              aria-label={t('navbar.goToDashboard')}
            >
              <AppLogo size="sm" />
            </Link>
            <nav
              className="ml-2 hidden items-center gap-1 lg:flex"
              aria-label={t('navbar.customerNav')}
            >
              <NavLink
                to={DASHBOARD}
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {t('navbar.myTickets')}
              </NavLink>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                onClick={() => openKnowledgeBase()}
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                {t('navbar.knowledgeBase')}
              </Button>
            </nav>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'hidden shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors lg:inline-flex',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => openKnowledgeBase()}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {t('navbar.knowledgeBase')}
          </Button>
        )}

        <div className="min-w-0 flex-1" aria-hidden />

        <KnowledgeBaseSearch className="min-w-0 w-full max-w-md" />

        <div className="flex shrink-0 items-center gap-2">
          {customer ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={t('navbar.myTickets')}
              onClick={() => navigate(DASHBOARD)}
            >
              <Ticket className="h-5 w-5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t('navbar.knowledgeBase')}
            onClick={() => openKnowledgeBase()}
          >
            <BookOpen className="h-5 w-5" />
          </Button>
          <UserNotificationsButton />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
