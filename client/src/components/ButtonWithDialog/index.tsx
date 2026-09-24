import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';

interface Props extends React.ComponentProps<typeof Button> {
  children?: ReactNode;
  dialogTitle: string;
  dialogText: string;
  className?: string;
  onConfirm?: () => void;
}

const ButtonWithDialog = ({
  children,
  onConfirm = () => {},
  type,
  dialogTitle,
  dialogText,
  className,
  ...props
}: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        {...props}
        type="button"
        className={className}
      >
        {children}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type={type} size="sm" onClick={handleConfirm} autoFocus>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ButtonWithDialog;
