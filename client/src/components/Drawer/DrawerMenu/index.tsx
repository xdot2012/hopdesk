import {
  BarChart3,
  ChevronLeft,
  History,
  LogOut,
  Menu,
  Settings,
  Ticket,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useSignOut from '~/api/auth/signOut';
import AppLogo from '~/components/AppLogo';
import { Separator } from '~/components/ui/separator';
import { cn } from '~/lib/utils';
import {
  INDICATORS,
  LOGOUT,
  SETTINGS,
  TICKETS,
  TICKETS_HISTORY,
} from '~/router/paths';
import { useUserStore } from '~/store';
import { isAdminRole } from '~/util/roles';
import DrawerButton from '../DrawerButton';
import DrawerButtonWithDialog from '../DrawerButtonWithDialog';

interface DrawerMenuProps {
  toggleDrawer: () => void;
  open: boolean;
}

/** Staff sidebar only — customers use the top-bar shell without this menu. */
export default function DrawerMenu({ toggleDrawer, open }: DrawerMenuProps) {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const { trigger: signOut } = useSignOut();
  const admin = isAdminRole(profile?.role);

  return (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          'flex items-center gap-1 px-3 py-3',
          open ? 'justify-between' : 'flex-col justify-center gap-2 px-2',
        )}
      >
        <AppLogo showText={open} size="sm" />
        <button
          type="button"
          onClick={toggleDrawer}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={!open ? t('navbar.expandMenu') : t('navbar.collapseMenu')}
          aria-label={!open ? t('navbar.expandMenu') : t('navbar.collapseMenu')}
        >
          {open ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="flex flex-1 flex-col gap-0.5 py-2">
        <DrawerButton text={t('navbar.tickets')} path={TICKETS} end drawerOpen={open}>
          <Ticket className="h-5 w-5" />
        </DrawerButton>
        <DrawerButton text={t('navbar.ticketsHistory')} path={TICKETS_HISTORY} drawerOpen={open}>
          <History className="h-5 w-5" />
        </DrawerButton>
        {admin && (
          <DrawerButton text={t('navbar.indicators')} path={INDICATORS} drawerOpen={open}>
            <BarChart3 className="h-5 w-5" />
          </DrawerButton>
        )}
        <DrawerButton text={t('navbar.settings')} path={SETTINGS} drawerOpen={open}>
          <Settings className="h-5 w-5" />
        </DrawerButton>
      </div>

      <DrawerButtonWithDialog
        className="border-t border-sidebar-border"
        text={t('navbar.logout')}
        path={LOGOUT}
        dialogTitle={t('navbar.logoutTitle')}
        dialogText={t('navbar.logoutDescription')}
        onConfirm={() => signOut()}
        drawerOpen={open}
      >
        <LogOut className="h-5 w-5" />
      </DrawerButtonWithDialog>
    </nav>
  );
}
