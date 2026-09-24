import { ReactNode, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import useSubscribeTicketEvents from '~/api/ticket/subscribeTicketEvents';
import AppLoading from '~/components/AppLoading';
import DesktopDrawer from '~/components/Drawer/DesktopDrawer';
import MobileDrawer from '~/components/Drawer/MobileDrawer';
import Navbar from '~/components/Navbar';
import KnowledgeBaseDialog from '~/pages/KnowledgeBase/KnowledgeBaseDialog';
import NewTicketDialog from '~/pages/Tickets/NewTicketDialog';
import OpenTicketFab from '~/pages/Tickets/OpenTicketFab';
import TicketDetailDialog from '~/pages/Tickets/TicketDetailDialog';
import useIsMobile from '~/hooks/useIsMobile';
import { cn } from '~/lib/utils';
import { useUserStore } from '~/store';
import { isCustomerRole } from '~/util/roles';

interface Props {
  children?: ReactNode;
}

export default function Dashboard({ children }: Props) {
  useSubscribeTicketEvents();
  const isMobile = useIsMobile();
  const { profile, isProfileSet } = useUserStore();
  // RestrictedRoute gates until the profile is set; shell is chosen once from role.
  const customer = isCustomerRole(profile?.role);
  const showDrawer = isProfileSet && !customer;
  const [open, setOpen] = useState(() => !isMobile);

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const toggleDrawer = () => setOpen((prev) => !prev);

  // Defensive: never paint staff/customer chrome until role is known.
  if (!isProfileSet) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <AppLoading />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {showDrawer &&
        (isMobile ? (
          <MobileDrawer open={open} toggleDrawer={toggleDrawer} />
        ) : (
          <DesktopDrawer open={open} toggleDrawer={toggleDrawer} />
        ))}
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          showMenuButton={showDrawer && isMobile}
          onMenuClick={toggleDrawer}
          customer={customer}
        />
        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5 md:px-5 md:py-3',
            customer && 'pb-24',
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
            {children}
          </div>
        </main>
      </div>
      {customer && <NewTicketDialog />}
      <TicketDetailDialog />
      <KnowledgeBaseDialog />
      {customer && <OpenTicketFab />}
    </div>
  );
}
