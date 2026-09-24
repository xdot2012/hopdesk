import { useTranslation } from 'react-i18next';
import TicketDetailView from '~/pages/Tickets/TicketDetailView';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog';
import { useTicketDetailDialogStore } from '~/store';

export default function TicketDetailDialog() {
  const { t } = useTranslation();
  const ticketId = useTicketDetailDialogStore((state) => state.ticketId);
  const setTicketId = useTicketDetailDialogStore((state) => state.setTicketId);
  const open = Boolean(ticketId);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setTicketId(null);
      }}
    >
      <DialogContent className="flex h-[min(96vh,100dvh)] w-[min(98vw,92rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogTitle className="sr-only">{t('tickets.detailTitle')}</DialogTitle>
        <DialogDescription className="sr-only">{t('tickets.detailSubtitle')}</DialogDescription>
        <div className="min-h-0 flex-1">
          {ticketId && <TicketDetailView ticketId={ticketId} compact />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
