import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildSearchAssigneeOptionsUrl } from '~/api/ticket/searchFilterUsers';
import type { TicketDetail } from '~/api/ticket/types';
import PaginatedUserAutocomplete from '~/components/PaginatedUserAutocomplete';
import { Button } from '~/components/ui/button';
import TicketMetaField from '~/pages/Tickets/TicketMetaField';

type AssigneeFieldProps = {
  ticket: TicketDetail;
  currentUserId?: string | null;
  assigning: boolean;
  updatingTicket: boolean;
  onAssigneeChange: (nextAssigneeId: string) => void;
  onAssignToMe: () => void;
};

export default function AssigneeField({
  ticket,
  currentUserId,
  assigning,
  updatingTicket,
  onAssigneeChange,
  onAssignToMe,
}: AssigneeFieldProps) {
  const { t } = useTranslation();

  return (
    <TicketMetaField icon={Users} label={t('tickets.columns.assignee')}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <PaginatedUserAutocomplete
          size="sm"
          value={ticket.assigneeUserId || ''}
          onValueChange={(next) => {
            onAssigneeChange(next);
          }}
          buildUrl={buildSearchAssigneeOptionsUrl}
          placeholder={t('tickets.selectAssignee')}
          staticOptions={
            ticket.assigneeUserId
              ? [
                  {
                    value: ticket.assigneeUserId,
                    label:
                      ticket.assigneeName ||
                      ticket.assigneeEmail ||
                      ticket.assigneeUserId,
                  },
                ]
              : []
          }
          aria-label={t('tickets.columns.assignee')}
          className="w-full min-w-[12rem]"
        />
        {currentUserId && ticket.assigneeUserId !== currentUserId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-fit px-1.5 text-[11px]"
            onClick={onAssignToMe}
            disabled={assigning || updatingTicket}
          >
            {t('tickets.assignToMe')}
          </Button>
        ) : null}
      </div>
    </TicketMetaField>
  );
}
