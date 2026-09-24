import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TicketListItem } from '~/api/ticket/types';
import DataTable, { type ColumnDef } from '~/components/DataTable';
import {
  TicketPriorityBadge,
  TicketSlaBadge,
  TicketStatusBadge,
} from '~/components/TicketBadges';
import EmptyState from '~/components/EmptyState';
import AuthenticatedAvatarImage from '~/components/AuthenticatedAvatarImage';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { ticketRowUrgencyClass } from '~/lib/ticketVisuals';
import { cn } from '~/lib/utils';
import { useTicketDetailDialogStore } from '~/store';

function assigneeInitials(name?: string | null) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function assigneeDisplayName(name?: string | null, email?: string | null) {
  const trimmed = name?.trim();
  if (trimmed && !trimmed.includes('@')) return trimmed;
  if (email) return email.split('@')[0] || null;
  if (trimmed?.includes('@')) return trimmed.split('@')[0] || null;
  return null;
}

type TicketListProps = {
  tickets: TicketListItem[];
  showSla?: boolean;
  showExternalId?: boolean;
  showSector?: boolean;
  showAssignee?: boolean;
  showRequester?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  /** Optional override; by default opens the shared ticket detail dialog. */
  onTicketClick?: (ticketId: string) => void;
  pageIndex?: number;
  pageCount?: number;
  pageSize?: number;
  onPageChange?: (pageIndex: number) => void;
  manualPagination?: boolean;
  /** When false, hides the subject search input (use server-side filters instead). */
  showSearch?: boolean;
  toolbarFilters?: ReactNode;
};

export default function TicketList({
  tickets,
  showSla = false,
  showExternalId = false,
  showSector = false,
  showAssignee = true,
  showRequester = false,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  onTicketClick,
  pageIndex = 0,
  pageCount = 1,
  pageSize = 15,
  onPageChange,
  manualPagination = false,
  showSearch = true,
  toolbarFilters,
}: TicketListProps) {
  const { t, i18n } = useTranslation();
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);

  const columns = useMemo<ColumnDef<TicketListItem>[]>(() => {
    const cols: ColumnDef<TicketListItem>[] = [
      {
        accessorKey: 'number',
        header: t('tickets.columns.number'),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-muted-foreground">
            #{row.original.number}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('tickets.columns.status'),
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'priorityLabel',
        header: t('tickets.columns.priority'),
        cell: ({ row }) => (
          <TicketPriorityBadge
            code={row.original.priorityCode}
            label={row.original.priorityLabel}
          />
        ),
      },
      {
        accessorKey: 'subject',
        header: t('tickets.columns.subject'),
        cell: ({ row }) => (
          <span className="line-clamp-1 font-medium" title={row.original.subject}>
            {row.original.subject}
          </span>
        ),
      },
    ];

    if (showExternalId) {
      cols.push({
        accessorKey: 'externalId',
        header: t('tickets.columns.externalId'),
        cell: ({ row }) => {
          const externalId = row.original.externalId?.trim();
          if (!externalId) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          return (
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              #{externalId}
            </span>
          );
        },
      });
    }

    if (showSector) {
      cols.push({
        accessorKey: 'sectorName',
        header: t('tickets.columns.sector'),
        cell: ({ row }) => {
          const name = row.original.sectorName;
          const color = row.original.sectorColor;
          if (!name) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <span className="inline-flex max-w-[10rem] items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: color || '#94A3B8' }}
                aria-hidden
              />
              <span className="truncate">{name}</span>
            </span>
          );
        },
      });
    }

    if (showRequester) {
      cols.push({
        accessorKey: 'requesterName',
        header: t('tickets.columns.requester'),
        cell: ({ row }) => {
          const email = row.original.requesterEmail?.trim() || null;
          const displayName = assigneeDisplayName(row.original.requesterName, email);
          if (!displayName && !email && !row.original.requesterAvatarUrl) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          const avatar = (
            <Avatar className="h-7 w-7">
              {row.original.requesterAvatarUrl ? (
                <AuthenticatedAvatarImage
                  src={row.original.requesterAvatarUrl}
                  alt={displayName || email || ''}
                />
              ) : null}
              <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
                {assigneeInitials(displayName || email)}
              </AvatarFallback>
            </Avatar>
          );

          if (!email) {
            return (
              <div className="flex items-center gap-2">
                {avatar}
                <span className="max-w-[8rem] truncate text-sm">{displayName}</span>
              </div>
            );
          }

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={email}
                >
                  {avatar}
                  <span className="max-w-[8rem] truncate text-sm">{displayName}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{email}</TooltipContent>
            </Tooltip>
          );
        },
      });
    }

    if (showAssignee) {
      cols.push({
        accessorKey: 'assigneeName',
        header: t('tickets.columns.assignee'),
        cell: ({ row }) => {
          const email = row.original.assigneeEmail?.trim() || null;
          const displayName = assigneeDisplayName(row.original.assigneeName, email);
          if (!displayName && !email && !row.original.assigneeAvatarUrl) {
            return (
              <span className="text-sm text-muted-foreground">{t('tickets.unassigned')}</span>
            );
          }

          const avatar = (
            <div className="relative">
              <Avatar className="h-7 w-7">
                {row.original.assigneeAvatarUrl && (
                  <AuthenticatedAvatarImage
                    src={row.original.assigneeAvatarUrl}
                    alt={displayName || email || ''}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                  {assigneeInitials(displayName || email)}
                </AvatarFallback>
              </Avatar>
            </div>
          );

          if (!email) {
            return (
              <div className="flex items-center gap-2">
                {avatar}
                <span className="max-w-[8rem] truncate text-sm">{displayName}</span>
              </div>
            );
          }

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={email}
                >
                  {avatar}
                  <span className="max-w-[8rem] truncate text-sm">{displayName}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{email}</TooltipContent>
            </Tooltip>
          );
        },
      });
    }

    if (showSla) {
      cols.push({
        accessorKey: 'slaStatus',
        header: t('tickets.columns.sla'),
        cell: ({ row }) => (
          <TicketSlaBadge
            status={row.original.slaStatus}
            firstRespondedAt={row.original.firstRespondedAt}
          />
        ),
      });
    }

    cols.push(
      {
        accessorKey: 'createdAt',
        header: t('tickets.columns.createdAt'),
        cell: ({ row }) => (
          <time
            dateTime={row.original.createdAt}
            className="whitespace-nowrap text-sm text-muted-foreground tabular-nums"
          >
            {new Date(row.original.createdAt).toLocaleString(i18n.language, {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </time>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: t('tickets.columns.updatedAt'),
        cell: ({ row }) => {
          const updatedAt = row.original.updatedAt || row.original.createdAt;
          const unread = Boolean(row.original.hasUnreadUpdate);
          return (
            <time
              dateTime={updatedAt}
              title={
                unread
                  ? t('tickets.columns.updatedAtUnread')
                  : t('tickets.columns.updatedAt')
              }
              className={cn(
                'inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-sm tabular-nums',
                unread
                  ? 'bg-primary/15 font-medium text-foreground ring-1 ring-inset ring-primary/25'
                  : 'text-muted-foreground',
              )}
            >
              {new Date(updatedAt).toLocaleString(i18n.language, {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </time>
          );
        },
      },
    );

    return cols;
  }, [t, i18n.language, showSla, showExternalId, showSector, showAssignee, showRequester]);

  if (tickets.length === 0) {
    return (
      <EmptyState
        title={emptyMessage ?? t('tickets.empty')}
        description={
          onEmptyAction && emptyActionLabel ? t('tickets.emptyHint') : undefined
        }
        actionLabel={onEmptyAction && emptyActionLabel ? emptyActionLabel : undefined}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={tickets}
      searchColumn={showSearch ? 'subject' : undefined}
      searchPlaceholder={t('tickets.search')}
      toolbarFilters={toolbarFilters}
      emptyMessage={t('tickets.noResults')}
      pageSize={pageSize}
      manualPagination={manualPagination}
      pageIndex={pageIndex}
      pageCount={pageCount}
      onPageChange={onPageChange}
      getRowClassName={(row) =>
        ticketRowUrgencyClass({
          slaStatus: row.original.slaStatus,
          priorityCode: row.original.priorityCode,
        })
      }
      onRowClick={(ticket) => {
        if (onTicketClick) {
          onTicketClick(ticket.id);
          return;
        }
        openTicket(ticket.id);
      }}
    />
  );
}
