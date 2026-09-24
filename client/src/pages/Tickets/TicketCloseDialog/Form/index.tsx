import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import useCreateTicketMessage from '~/api/ticket/createMessage';
import useGetTicket from '~/api/ticket/getTicket';
import type { TicketListItem } from '~/api/ticket/types';
import useUpdateTicket from '~/api/ticket/updateTicket';
import { Button } from '~/components/ui/button';
import { DialogFooter } from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import {
  EFFORT_OPTIONS,
  ticketCloseSchema,
  type TicketCloseFormType,
} from '../schema';

type Props = {
  ticket: TicketListItem;
  onCancel: () => void;
  onCompleted?: () => void;
};

export default function TicketCloseForm({
  ticket,
  onCancel,
  onCompleted,
}: Props) {
  const { t } = useTranslation();
  const showError = useAlertStore((state) => state.showError);
  const showSuccessSnack = useAlertStore((state) => state.showSuccessSnack);
  const { mutate } = useGetTicket(ticket.id);
  const { trigger: updateTicket, isMutating: updatingTicket } = useUpdateTicket(ticket.id);
  const { trigger: createMessage, isMutating: creatingMessage } = useCreateTicketMessage(ticket.id);
  const submitting = updatingTicket || creatingMessage;
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<TicketCloseFormType>({
    mode: 'onChange',
    resolver: zodResolver(ticketCloseSchema),
    defaultValues: {
      cause: '',
      solution: '',
      effortMinutes: undefined,
      asInternalNote: false,
    },
  });
  const asInternalNote = watch('asInternalNote');

  const onSubmit = async (values: TicketCloseFormType) => {
    try {
      await updateTicket({
        status: 'closed',
        cause: values.cause,
        solution: values.solution,
        solutionInternal: values.asInternalNote,
        effortMinutes: values.effortMinutes,
      });
      if (values.asInternalNote) {
        await createMessage({
          body: t('tickets.board.close.closureNotice', {
            number: ticket.number,
            subject: ticket.subject,
          }),
          visibility: 'public',
        });
      }
      await mutate();
      showSuccessSnack(t('tickets.board.close.success'));
      onCancel();
      onCompleted?.();
    } catch (error) {
      showError(getApiErrorMessage(error, t('tickets.board.close.error')));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="ticket-close-cause">
            {t('tickets.board.close.causeLabel')}
          </Label>
          <textarea
            id="ticket-close-cause"
            className="min-h-[7rem] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
            {...register('cause')}
            placeholder={t('tickets.board.close.causePlaceholder')}
            autoFocus
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticket-close-solution">
            {t('tickets.board.close.solutionLabel')}
          </Label>
          <textarea
            id="ticket-close-solution"
            className="min-h-[7rem] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
            {...register('solution')}
            placeholder={t('tickets.board.close.solutionPlaceholder')}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticket-close-effort">
            {t('tickets.board.close.effortLabel')}
          </Label>
          <select
            id="ticket-close-effort"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
            {...register('effortMinutes')}
            disabled={submitting}
          >
            <option value="">
              {t('tickets.board.close.effortPlaceholder')}
            </option>
            {EFFORT_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t('tickets.board.close.effortOption', { minutes })}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t('tickets.board.close.effortHint')}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <div className="min-w-0 space-y-0.5">
            <Label
              htmlFor="ticket-close-internal"
              className="cursor-pointer"
            >
              {t('tickets.board.close.internalLabel')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {asInternalNote
                ? t('tickets.board.close.internalHint')
                : t('tickets.board.close.publicHint')}
            </p>
          </div>
          <Controller
            name="asInternalNote"
            control={control}
            render={({ field }) => (
              <Switch
                id="ticket-close-internal"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={submitting}
                aria-label={t('tickets.board.close.internalLabel')}
              />
            )}
          />
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting || !isValid}>
          {submitting
            ? t('common.loading')
            : t('tickets.board.close.submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}
