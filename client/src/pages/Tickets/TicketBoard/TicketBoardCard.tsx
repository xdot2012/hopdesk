import { CalendarDays, GripVertical, Hourglass } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TicketListItem } from '~/api/ticket/types';
import { TicketPriorityBadge } from '~/components/TicketBadges';
import AuthenticatedAvatarImage from '~/components/AuthenticatedAvatarImage';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Card, CardContent } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { isSlaBreached, ticketElapsedActiveMinutes } from '~/lib/ticketVisuals';
import { cn } from '~/lib/utils';
import { useTicketDetailDialogStore } from '~/store';

function assigneeInitials(name?: string | null) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function assigneeDisplayName(name?: string | null, email?: string | null) {
  const trimmed = name?.trim();
  if (trimmed && !trimmed.includes('@')) return trimmed;
  if (email) return email.split('@')[0] || null;
  if (trimmed?.includes('@')) return trimmed.split('@')[0] || null;
  return null;
}

function formatTicketDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
}

type TicketBoardCardProps = {
  ticket: TicketListItem;
  showSla?: boolean;
  isDragging?: boolean;
  isUpdating?: boolean;
  onDragStart: (ticketId: string) => void;
  onDragEnd: () => void;
};

export default function TicketBoardCard({
  ticket,
  showSla = false,
  isDragging = false,
  isUpdating = false,
  onDragStart,
  onDragEnd,
}: TicketBoardCardProps) {
  const { t, i18n } = useTranslation();
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);
  const didDragRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragImageRef = useRef<HTMLElement | null>(null);
  const assigneeName = assigneeDisplayName(ticket.assigneeName, ticket.assigneeEmail);
  const unread = Boolean(ticket.hasUnreadUpdate);
  const externalId = ticket.externalId?.trim();
  const priorityLabel = ticket.priorityLabel?.trim() || (
    ticket.priorityCode
      ? String(t(`tickets.priorityCode.${ticket.priorityCode}`, { defaultValue: ticket.priorityCode }))
      : t('tickets.unassigned')
  );
  const elapsedMinutes = ticketElapsedActiveMinutes({
    createdAt: ticket.createdAt,
    totalHoldSeconds: ticket.totalHoldSeconds,
    holdStartedAt: ticket.holdStartedAt,
    resolvedAt: ticket.resolvedAt,
    status: ticket.status,
  });
  const slaBroken = isSlaBreached(ticket.slaStatus);
  const clearDragImage = () => {
    dragImageRef.current?.remove();
    dragImageRef.current = null;
  };
  const openIfNotDragging = () => {
    if (!didDragRef.current) openTicket(ticket.id);
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        'gap-0 overflow-hidden border bg-card py-0 transition-shadow hover:shadow-md',
        isDragging && 'opacity-40 ring-2 ring-primary/30',
        isUpdating && 'pointer-events-none opacity-70',
        unread && 'border-primary ring-1 ring-primary/40',
      )}
    >
      <CardContent className="flex items-start gap-1.5 p-3">
        <button
          type="button"
          draggable
          aria-label={t('tickets.board.dragHandle')}
          className="-ml-0.5 -mt-0.5 shrink-0 cursor-grab touch-none self-start rounded p-0.5 text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
          onDragStart={(event) => {
            didDragRef.current = false;
            event.dataTransfer.setData('text/plain', ticket.id);
            event.dataTransfer.effectAllowed = 'move';
            const card = cardRef.current;
            if (card) {
              clearDragImage();
              const rect = card.getBoundingClientRect();
              const clone = card.cloneNode(true) as HTMLElement;
              clone.style.position = 'absolute';
              clone.style.top = '-9999px';
              clone.style.left = '-9999px';
              clone.style.width = `${rect.width}px`;
              clone.style.margin = '0';
              clone.style.opacity = '1';
              clone.style.pointerEvents = 'none';
              clone.style.boxShadow = '0 12px 28px rgb(0 0 0 / 18%)';
              document.body.appendChild(clone);
              dragImageRef.current = clone;
              event.dataTransfer.setDragImage(clone, event.clientX - rect.left, event.clientY - rect.top);
            }
            onDragStart(ticket.id);
          }}
          onDrag={(event) => {
            if (event.clientX !== 0 || event.clientY !== 0) didDragRef.current = true;
          }}
          onDragEnd={() => {
            clearDragImage();
            onDragEnd();
            window.setTimeout(() => { didDragRef.current = false; }, 0);
          }}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div
          role="button"
          tabIndex={0}
          className="min-w-0 flex-1 cursor-pointer space-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={openIfNotDragging}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openIfNotDragging();
            }
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium tabular-nums text-muted-foreground">#{ticket.number}</p>
            {externalId ? (
              <p className="max-w-[50%] truncate text-xs font-medium tabular-nums text-muted-foreground" title={`${t('tickets.externalId')}: ${externalId}`}>#{externalId}</p>
            ) : null}
          </div>
          <p className="line-clamp-2 text-sm font-semibold leading-snug" title={ticket.subject}>{ticket.subject}</p>
          <div className="space-y-1 text-[11px] tabular-nums text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
              <time dateTime={ticket.createdAt}>{formatTicketDateTime(ticket.createdAt, i18n.language)}</time>
            </div>
            <div className={cn('flex items-center gap-1.5', unread && 'font-medium text-foreground')}>
              <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
              <time dateTime={ticket.updatedAt}>{formatTicketDateTime(ticket.updatedAt, i18n.language)}</time>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex shrink-0">
                    <Avatar className="h-6 w-6">
                      {ticket.assigneeAvatarUrl ? (
                        <AuthenticatedAvatarImage
                          src={ticket.assigneeAvatarUrl}
                          alt={assigneeName || ''}
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
                        {assigneeInitials(assigneeName || ticket.assigneeEmail)}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{assigneeName || t('tickets.unassigned')}</TooltipContent>
              </Tooltip>
              <TicketPriorityBadge code={ticket.priorityCode} label={priorityLabel} className="h-6 shrink-0 px-1.5 text-[10px]" />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center', showSla && slaBroken ? 'text-destructive' : 'text-muted-foreground')}
                  aria-label={t('tickets.board.elapsedTime')}
                >
                  <Hourglass className="h-3.5 w-3.5" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('tickets.board.elapsedMinutes', { count: elapsedMinutes })}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
