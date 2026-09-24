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

type CancelTicketDialogProps = {
  open: boolean;
  ticketNumber: number;
  ticketSubject: string;
  cancelling: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export default function CancelTicketDialog({
  open,
  ticketNumber,
  ticketSubject,
  cancelling,
  onOpenChange,
  onConfirm,
}: CancelTicketDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (cancelling) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tickets.cancelByRequester.title')}</DialogTitle>
          <DialogDescription>
            {t('tickets.cancelByRequester.confirm', {
              number: ticketNumber,
              subject: ticketSubject,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
          >
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={cancelling}
            onClick={onConfirm}
            autoFocus
          >
            {t('tickets.cancelByRequester.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
