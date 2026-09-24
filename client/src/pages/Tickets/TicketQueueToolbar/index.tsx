import { Search } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useListPriorities from '~/api/ticket/listPriorities';
import {
  buildSearchAssigneeOptionsUrl,
  buildSearchRequesterOptionsUrl,
} from '~/api/ticket/searchFilterUsers';
import type { TicketListItem } from '~/api/ticket/types';
import AuthenticatedAvatarImage from '~/components/AuthenticatedAvatarImage';
import DateRangePicker from '~/components/DateRangePicker';
import PaginatedUserAutocomplete from '~/components/PaginatedUserAutocomplete';
import SelectField from '~/components/SelectField';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';
import { useUserStore } from '~/store';

export const UNASSIGNED_ASSIGNEE = '__unassigned__';

function getUserInitials(name?: string | null, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.split('@')[0] ?? 'U').slice(0, 2).toUpperCase();
}

export type TicketQueueFilterState = {
  search: string;
  number: string;
  externalId: string;
  assigneeId: string;
  requesterId: string;
  priorityCode: string;
  assignedToMe: boolean;
  createdFrom: string;
  createdTo: string;
  finishedFrom: string;
  finishedTo: string;
};

export const EMPTY_TICKET_QUEUE_FILTERS: TicketQueueFilterState = {
  search: '',
  number: '',
  externalId: '',
  assigneeId: '',
  requesterId: '',
  priorityCode: '',
  assignedToMe: false,
  createdFrom: '',
  createdTo: '',
  finishedFrom: '',
  finishedTo: '',
};

function isoDatePart(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function matchesTicketSearch(ticket: TicketListItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    String(ticket.number),
    ticket.subject,
    ticket.externalId,
    ticket.requesterName,
    ticket.requesterEmail,
    ticket.assigneeName,
    ticket.assigneeEmail,
    ticket.sectorName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalized);
}

export function matchesTicketQueueFilters(
  ticket: TicketListItem,
  filters: TicketQueueFilterState,
  profileId?: string | null,
) {
  const assigneeId =
    filters.assignedToMe && profileId ? profileId : filters.assigneeId;

  if (assigneeId) {
    if (assigneeId === UNASSIGNED_ASSIGNEE) {
      if (ticket.assigneeUserId) return false;
    } else if (ticket.assigneeUserId !== assigneeId) {
      return false;
    }
  }

  if (filters.requesterId && ticket.requesterUserId !== filters.requesterId) {
    return false;
  }

  if (filters.priorityCode && ticket.priorityCode !== filters.priorityCode) {
    return false;
  }

  const numberTrimmed = filters.number.trim();
  if (numberTrimmed) {
    const parsed = Number.parseInt(numberTrimmed, 10);
    if (Number.isFinite(parsed) && parsed > 0 && ticket.number !== parsed) {
      return false;
    }
  }

  const externalId = filters.externalId.trim().toLowerCase();
  if (externalId) {
    const ticketExternal = (ticket.externalId ?? '').toLowerCase();
    if (!ticketExternal.includes(externalId)) return false;
  }

  const createdAt = isoDatePart(ticket.createdAt);
  if (filters.createdFrom && createdAt < filters.createdFrom) return false;
  if (filters.createdTo && createdAt > filters.createdTo) return false;

  const finishedAt = isoDatePart(ticket.resolvedAt ?? ticket.updatedAt);
  if (filters.finishedFrom && finishedAt < filters.finishedFrom) return false;
  if (filters.finishedTo && finishedAt > filters.finishedTo) return false;

  return matchesTicketSearch(ticket, filters.search);
}

export function filterTicketQueue(
  tickets: TicketListItem[],
  filters: TicketQueueFilterState,
  profileId?: string | null,
) {
  return tickets.filter((ticket) => matchesTicketQueueFilters(ticket, filters, profileId));
}

export function hasActiveTicketFilters(
  filters: TicketQueueFilterState,
  options?: { includeFinishedDate?: boolean },
) {
  const includeFinishedDate = options?.includeFinishedDate ?? false;
  return Boolean(
    filters.search.trim() ||
      filters.number.trim() ||
      filters.externalId.trim() ||
      filters.assigneeId ||
      filters.requesterId ||
      filters.priorityCode ||
      filters.assignedToMe ||
      filters.createdFrom ||
      filters.createdTo ||
      (includeFinishedDate && (filters.finishedFrom || filters.finishedTo)),
  );
}

type Props = {
  value: TicketQueueFilterState;
  onChange: (next: TicketQueueFilterState) => void;
  /** Finished-date range is only shown on history. */
  showFinishedDate?: boolean;
};

export default function TicketQueueToolbar({
  value,
  onChange,
  showFinishedDate = false,
}: Props) {
  const { t } = useTranslation();
  const profile = useUserStore((state) => state.profile);
  const profileId = profile?.id;
  const { priorities } = useListPriorities();
  const profileLabel =
    profile?.name?.trim() || profile?.email?.split('@')[0] || t('common.user');
  const profileInitials = getUserInitials(profile?.name, profile?.email);

  const assigneeStaticOptions = useMemo(
    () => [{ value: UNASSIGNED_ASSIGNEE, label: t('tickets.unassigned') }],
    [t],
  );

  const priorityOptions = useMemo(
    () => [
      { value: '', label: t('tickets.boardFilters.allPriorities') },
      ...priorities.map((priority) => ({
        value: priority.code,
        label:
          priority.label ||
          String(t(`tickets.priorityCode.${priority.code}`, { defaultValue: priority.code })),
      })),
    ],
    [priorities, t],
  );

  const patch = (partial: Partial<TicketQueueFilterState>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:w-44">
          <Label htmlFor="ticket-filter-search" className="text-xs text-muted-foreground">
            {t('tickets.searchLabel')}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="ticket-filter-search"
              value={value.search}
              onChange={(event) => patch({ search: event.target.value })}
              placeholder={t('tickets.search')}
              className="h-9 pl-8"
              aria-label={t('tickets.search')}
            />
          </div>
        </div>
        <div className="w-[7.5rem] space-y-1.5">
          <Label htmlFor="ticket-filter-number" className="text-xs text-muted-foreground">
            {t('tickets.customerFilters.number')}
          </Label>
          <Input
            id="ticket-filter-number"
            inputMode="numeric"
            value={value.number}
            onChange={(event) => patch({ number: event.target.value.replace(/\D/g, '') })}
            placeholder={t('tickets.customerFilters.numberPlaceholder')}
            className="h-9"
          />
        </div>
        <div className="w-36 space-y-1.5">
          <Label htmlFor="ticket-filter-external-id" className="text-xs text-muted-foreground">
            {t('tickets.customerFilters.externalId')}
          </Label>
          <Input
            id="ticket-filter-external-id"
            value={value.externalId}
            onChange={(event) => patch({ externalId: event.target.value })}
            placeholder={t('tickets.externalIdPlaceholder')}
            className="h-9"
          />
        </div>
        <div className="w-40 space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('tickets.boardFilters.priority')}
          </Label>
          <SelectField
            size="sm"
            value={value.priorityCode}
            onValueChange={(next) => patch({ priorityCode: next })}
            options={priorityOptions}
            placeholder={t('tickets.boardFilters.priority')}
            aria-label={t('tickets.boardFilters.priority')}
          />
        </div>
        <div className="w-44 space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('tickets.boardFilters.assignee')}
          </Label>
          <PaginatedUserAutocomplete
            size="sm"
            value={value.assignedToMe ? '' : value.assigneeId}
            onValueChange={(next) => {
              patch({ assignedToMe: false, assigneeId: next });
            }}
            buildUrl={buildSearchAssigneeOptionsUrl}
            placeholder={t('tickets.boardFilters.assignee')}
            emptyOptionLabel={t('tickets.boardFilters.allAssignees')}
            staticOptions={assigneeStaticOptions}
            aria-label={t('tickets.boardFilters.assignee')}
          />
        </div>
        <div className="w-44 space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('tickets.boardFilters.requester')}
          </Label>
          <PaginatedUserAutocomplete
            size="sm"
            value={value.requesterId}
            onValueChange={(next) => patch({ requesterId: next })}
            buildUrl={buildSearchRequesterOptionsUrl}
            placeholder={t('tickets.boardFilters.requester')}
            emptyOptionLabel={t('tickets.boardFilters.allRequesters')}
            aria-label={t('tickets.boardFilters.requester')}
          />
        </div>
        <div className="w-48 space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('tickets.customerFilters.dateRange')}
          </Label>
          <DateRangePicker
            size="sm"
            value={{ from: value.createdFrom || undefined, to: value.createdTo || undefined }}
            onChange={(range) => {
              patch({
                createdFrom: range.from ?? '',
                createdTo: range.to ?? '',
              });
            }}
          />
        </div>
        {showFinishedDate ? (
          <div className="w-48 space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t('tickets.history.periodLabel')}
            </Label>
            <DateRangePicker
              size="sm"
              value={{
                from: value.finishedFrom || undefined,
                to: value.finishedTo || undefined,
              }}
              onChange={(range) => {
                patch({
                  finishedFrom: range.from ?? '',
                  finishedTo: range.to ?? '',
                });
              }}
              aria-label={t('tickets.history.periodLabel')}
            />
          </div>
        ) : null}
      </div>
      {profileId ? (
        <button
          type="button"
          aria-pressed={value.assignedToMe}
          aria-label={t('tickets.boardFilters.assignedToMe')}
          title={t('tickets.boardFilters.assignedToMe')}
          onClick={() => {
            const next = !value.assignedToMe;
            patch({
              assignedToMe: next,
              assigneeId: next ? '' : value.assigneeId,
            });
          }}
          className={cn(
            'ml-auto shrink-0 rounded-full border-2 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            value.assignedToMe
              ? 'border-primary'
              : 'border-transparent hover:border-muted-foreground/40',
          )}
        >
          <Avatar className="h-8 w-8">
            {profile?.avatarUrl ? (
              <AuthenticatedAvatarImage src={profile.avatarUrl} alt={profileLabel} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
              {profileInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      ) : null}
    </div>
  );
}
