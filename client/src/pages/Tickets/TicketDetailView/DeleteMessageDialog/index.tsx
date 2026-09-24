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

type DeleteMessageDialogProps = {
  messageId: string | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: (messageId: string) => void;
};

export default function DeleteMessageDialog({
  messageId,
  deleting,
  onClose,
  onConfirm,
}: DeleteMessageDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={Boolean(messageId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tickets.deleteMessageTitle')}</DialogTitle>
          <DialogDescription>{t('tickets.deleteMessageConfirm')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!messageId || deleting}
            onClick={() => {
              if (messageId) onConfirm(messageId);
            }}
            autoFocus
          >
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
