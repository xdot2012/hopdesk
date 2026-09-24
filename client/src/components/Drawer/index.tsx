import { isMobile } from '~/util/functions';
import DesktopDrawer from './DesktopDrawer';
import MobileDrawer from './MobileDrawer';

export interface ResposiveDrawerProps {
  open: boolean;
  toggleDrawer: () => void;
}

export default function ResposiveDrawer({ open, toggleDrawer }: ResposiveDrawerProps) {
  const isMobileDevice = isMobile();

  return isMobileDevice ? (
    <MobileDrawer open={open} toggleDrawer={toggleDrawer} />
  ) : (
    <DesktopDrawer open={open} toggleDrawer={toggleDrawer} />
  );
}
