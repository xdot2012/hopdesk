import { cn } from '~/lib/utils';
import DrawerMenu from '../DrawerMenu';

const drawerWidth = 240;
const collapsedWidth = 65;

export interface DesktopDrawerProps {
  open: boolean;
  toggleDrawer: () => void;
}

export default function DesktopDrawer({ open, toggleDrawer }: DesktopDrawerProps) {
  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col overflow-x-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out',
        open ? 'w-[240px]' : 'w-[65px]',
      )}
      style={{ width: open ? drawerWidth : collapsedWidth }}
    >
      <DrawerMenu toggleDrawer={toggleDrawer} open={open} />
    </aside>
  );
}
