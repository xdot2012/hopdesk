import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCreateTicketMessage from '~/api/ticket/createMessage';
import useGetTicket from '~/api/ticket/getTicket';
import useListPriorities from '~/api/ticket/listPriorities';
import type { TicketListItem } from '~/api/ticket/types';
import useUpdateTicket from '~/api/ticket/updateTicket';
import { TicketPrioritySelect } from '~/components/TicketBadges';
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
import type { BoardStatus } from '~/lib/ticketStatusActions';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';

type TicketTriageExitDialogProps = {
  ticket: TicketListItem | null;
  targetStatus: BoardStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

export default function TicketTriageExitDialog({
  ticket,
  targetStatus,
  open,
  onOpenChange,
  onCompleted,
}: TicketTriageExitDialogProps) {
  const { t } = useTranslation();
  const showError = useAlertStore((state) => state.showError);
  const showSuccessSnack = useAlertStore((state) => state.showSuccessSnack);
  const { priorities } = useListPriorities();
  const ticketId = ticket?.id ?? '';
  const { mutate } = useGetTicket(ticket?.id);
  const { trigger: createMessage, isMutating: creatingMessage } = useCreateTicketMessage(ticketId);
  const { trigger: updateTicket, isMutating: updatingTicket } = useUpdateTicket(ticketId);
  const submitting = creatingMessage || updatingTicket;
  const [priorityId, setPriorityId] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const priorityOptions = useMemo(
    () =>
      priorities.map((priority) => ({
        value: priority.id,
        label: priority.label,
        code: priority.code,
      })),
    [priorities],
  );

  useEffect(() => {
    if (open && ticket) {
      setPriorityId(ticket.priorityId);
      setInternalNote('');
    }
  }, [open, ticket]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting) return;
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || !targetStatus) return;

    try {
      if (internalNote.trim()) {
        await createMessage({
          body: internalNote.trim(),
          visibility: 'internal',
        });
      }
      await updateTicket({
        status: targetStatus,
        priorityId: priorityId || ticket.priorityId,
      });
      await mutate();
      showSuccessSnack(t('tickets.board.triageExit.success'));
      onOpenChange(false);
      onCompleted?.();
    } catch (error) {
      showError(getApiErrorMessage(error, t('tickets.board.triageExit.error')));
    }
  };

  if (!ticket || !targetStatus) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('tickets.board.triageExit.title')}</DialogTitle>
            <DialogDescription>
              {t('tickets.board.triageExit.description', {
                number: ticket.number,
                subject: ticket.subject,
                status: t(`tickets.status.${targetStatus}`),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('tickets.columns.priority')}</Label>
              <TicketPrioritySelect
                value={priorityId}
                onValueChange={setPriorityId}
                options={priorityOptions}
                disabled={submitting}
                aria-label={t('tickets.columns.priority')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="triage-exit-note">{t('tickets.board.triageExit.noteLabel')}</Label>
              <textarea
                id="triage-exit-note"
                className="min-h-[8rem] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder={t('tickets.internalNote')}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">{t('tickets.board.triageExit.noteHint')}</p>
            </div>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? t('common.loading') : t('tickets.board.triageExit.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
