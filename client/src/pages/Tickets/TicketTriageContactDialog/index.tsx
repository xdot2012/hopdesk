import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCreateTicketMessage from '~/api/ticket/createMessage';
import useGetTicket from '~/api/ticket/getTicket';
import type { TicketListItem } from '~/api/ticket/types';
import useUpdateTicket from '~/api/ticket/updateTicket';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { buildTriageFirstContactMessage } from '~/lib/ticketStatusActions';
import { useAlertStore, useUserStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';

type TicketTriageContactDialogProps = {
  ticket: TicketListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

export default function TicketTriageContactDialog({
  ticket,
  open,
  onOpenChange,
  onCompleted,
}: TicketTriageContactDialogProps) {
  const { t } = useTranslation();
  const showError = useAlertStore((state) => state.showError);
  const showSuccessSnack = useAlertStore((state) => state.showSuccessSnack);
  const profile = useUserStore((state) => state.profile);
  const ticketId = ticket?.id ?? '';
  const { mutate } = useGetTicket(ticket?.id);
  const { trigger: createMessage, isMutating: creatingMessage } = useCreateTicketMessage(ticketId);
  const { trigger: updateTicket, isMutating: updatingTicket } = useUpdateTicket(ticketId);
  const submitting = creatingMessage || updatingTicket;
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open && ticket) {
      setMessage(buildTriageFirstContactMessage(t, ticket));
    }
  }, [open, ticket, t]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting) return;
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || !message.trim()) return;

    try {
      await createMessage({ body: message.trim(), visibility: 'public' });
      await updateTicket({
        status: 'triage',
        ...(profile?.id ? { assigneeUserId: profile.id } : {}),
      });
      await mutate();
      showSuccessSnack(t('tickets.board.triageContact.success'));
      onOpenChange(false);
      onCompleted?.();
    } catch (error) {
      showError(getApiErrorMessage(error, t('tickets.board.triageContact.error')));
    }
  };

  if (!ticket) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('tickets.board.triageContact.title')}</DialogTitle>
            <DialogDescription>
              {t('tickets.board.triageContact.description', {
                number: ticket.number,
                subject: ticket.subject,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="triage-contact-message">{t('tickets.board.triageContact.messageLabel')}</Label>
            <textarea
              id="triage-contact-message"
              className="min-h-[10rem] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t('tickets.replyPlaceholder')}
              autoFocus
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">{t('tickets.board.triageContact.hint')}</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || !message.trim()}>
              {submitting ? t('common.loading') : t('tickets.board.triageContact.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
