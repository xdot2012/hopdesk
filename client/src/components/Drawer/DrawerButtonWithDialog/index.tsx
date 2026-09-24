import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { cn } from '~/lib/utils';

interface Props {
  children?: ReactNode;
  text: string;
  path: string;
  dialogTitle: string;
  dialogText: string;
  className?: string;
  onConfirm?: () => void;
  drawerOpen?: boolean;
}

export default function DrawerButtonWithDialog({
  children,
  onConfirm = () => {},
  text,
  path,
  dialogTitle,
  dialogText,
  className,
  drawerOpen = true,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    navigate(path);
    setOpen(false);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={!drawerOpen ? text : undefined}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          !drawerOpen && 'justify-center',
        )}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{children}</span>
        {drawerOpen && <span className="truncate">{text}</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirm} autoFocus>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
