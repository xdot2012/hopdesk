import { useTranslation } from 'react-i18next';
import type { TicketListItem } from '~/api/ticket/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import TicketCloseForm from './Form';

type Props = {
  ticket: TicketListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

export default function TicketCloseDialog({
  ticket,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const { t } = useTranslation();
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('tickets.board.close.title')}</DialogTitle>
          <DialogDescription>
            {t('tickets.board.close.description', {
              number: ticket.number,
              subject: ticket.subject,
            })}
          </DialogDescription>
        </DialogHeader>
        <TicketCloseForm
          key={`${open}-${ticket.id}`}
          ticket={ticket}
          onCancel={() => onOpenChange(false)}
          onCompleted={onCompleted}
        />
      </DialogContent>
    </Dialog>
  );
}
