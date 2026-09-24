import { Sheet, SheetContent, SheetTitle } from '~/components/ui/sheet';
import DrawerMenu from '../DrawerMenu';

interface MobileDrawerProps {
  open: boolean;
  toggleDrawer: () => void;
}

export default function MobileDrawer({ open, toggleDrawer }: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && toggleDrawer()}>
      <SheetContent side="left" className="w-[240px] border-sidebar-border bg-sidebar p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <DrawerMenu toggleDrawer={toggleDrawer} open={true} />
      </SheetContent>
    </Sheet>
  );
}
