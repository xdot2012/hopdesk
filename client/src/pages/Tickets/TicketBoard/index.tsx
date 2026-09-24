import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { ticketDetailPath } from '~/api';
import type { TicketListItem } from '~/api/ticket/types';
import { updateTicket } from '~/api/ticket/updateTicket';
import EmptyState from '~/components/EmptyState';
import { TicketStatusBadge } from '~/components/TicketBadges';
import {
  BOARD_STATUSES,
  type BoardStatus,
  canTransitionBoardStatus,
  getStatusTransitionAction,
  normalizeBoardStatus,
} from '~/lib/ticketStatusActions';
import { ticketBoardColumnHeaderStyle, ticketBoardColumnStyle } from '~/lib/ticketVisuals';
import { cn } from '~/lib/utils';
import TicketCloseDialog from '~/pages/Tickets/TicketCloseDialog';
import TicketTriageContactDialog from '~/pages/Tickets/TicketTriageContactDialog';
import TicketTriageExitDialog from '~/pages/Tickets/TicketTriageExitDialog';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import TicketBoardCard from './TicketBoardCard';

type TicketBoardProps = {
  tickets: TicketListItem[];
  showSla?: boolean;
  emptyMessage?: string;
};

export default function TicketBoard({
  tickets,
  showSla = false,
  emptyMessage,
}: TicketBoardProps) {
  const { t } = useTranslation();
  const showError = useAlertStore((state) => state.showError);
  const [optimisticTickets, setOptimisticTickets] = useState<TicketListItem[] | null>(null);
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<BoardStatus | null>(null);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [triageContactTicket, setTriageContactTicket] = useState<TicketListItem | null>(null);
  const [triageExitState, setTriageExitState] = useState<{ ticket: TicketListItem; targetStatus: BoardStatus } | null>(null);
  const [closeTicket, setCloseTicket] = useState<TicketListItem | null>(null);
  const displayTickets = optimisticTickets ?? tickets;
  const columns = useMemo(() => {
    const grouped = Object.fromEntries(BOARD_STATUSES.map((status) => [status, [] as TicketListItem[]]));
    for (const ticket of displayTickets) {
      const column = normalizeBoardStatus(ticket.status);
      if (column in grouped) grouped[column].push(ticket);
    }
    for (const status of BOARD_STATUSES) {
      grouped[status].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
    }
    return BOARD_STATUSES.map((status) => ({ status, tickets: grouped[status] ?? [] }));
  }, [displayTickets]);

  const handleStatusChange = useCallback(async (ticketId: string, nextStatus: BoardStatus) => {
    const ticket = displayTickets.find((item) => item.id === ticketId);
    if (!ticket || normalizeBoardStatus(ticket.status) === nextStatus) return;
    const previousTickets = displayTickets;
    setUpdatingTicketId(ticketId);
    setOptimisticTickets(displayTickets.map((item) => item.id === ticketId
      ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
      : item));
    try {
      await updateTicket(ticketId, { status: nextStatus });
      await mutate(ticketDetailPath(ticketId));
    } catch (error) {
      setOptimisticTickets(previousTickets);
      showError(getApiErrorMessage(error, t('tickets.board.statusUpdateError')));
    } finally {
      setUpdatingTicketId(null);
      setOptimisticTickets(null);
    }
  }, [displayTickets, showError, t]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>, targetStatus: BoardStatus) => {
    event.preventDefault();
    const ticketId = event.dataTransfer.getData('text/plain');
    setDropTargetStatus(null);
    setDraggingTicketId(null);
    if (!ticketId) return;
    const ticket = displayTickets.find((item) => item.id === ticketId);
    if (!ticket) return;
    const currentStatus = normalizeBoardStatus(ticket.status);
    if (currentStatus === targetStatus) return;
    if (!canTransitionBoardStatus(currentStatus, targetStatus)) {
      showError(t('tickets.board.invalidTransition'));
      return;
    }
    const action = getStatusTransitionAction(currentStatus, targetStatus);
    if (action === 'close') setCloseTicket(ticket);
    else if (action === 'triage_first_contact') setTriageContactTicket(ticket);
    else if (action === 'triage_exit') setTriageExitState({ ticket, targetStatus });
    else void handleStatusChange(ticketId, targetStatus);
  }, [displayTickets, handleStatusChange, showError, t]);

  const isValidDropTarget = useCallback((targetStatus: BoardStatus) => {
    if (!draggingTicketId) return false;
    const ticket = displayTickets.find((item) => item.id === draggingTicketId);
    return ticket ? canTransitionBoardStatus(normalizeBoardStatus(ticket.status), targetStatus) : false;
  }, [displayTickets, draggingTicketId]);

  return (
    <>
      <TicketTriageContactDialog ticket={triageContactTicket} open={Boolean(triageContactTicket)} onOpenChange={(open) => { if (!open) setTriageContactTicket(null); }} />
      <TicketTriageExitDialog ticket={triageExitState?.ticket ?? null} targetStatus={triageExitState?.targetStatus ?? null} open={Boolean(triageExitState)} onOpenChange={(open) => { if (!open) setTriageExitState(null); }} />
      <TicketCloseDialog ticket={closeTicket} open={Boolean(closeTicket)} onOpenChange={(open) => { if (!open) setCloseTicket(null); }} />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {displayTickets.length === 0 ? (
          <EmptyState title={emptyMessage ?? t('tickets.empty')} />
        ) : (
          <div className="min-h-0 flex-1 overflow-x-auto pb-2">
            <div className="flex min-h-[24rem] w-full gap-3 md:gap-4">
              {columns.map(({ status, tickets: columnTickets }) => (
                <section
                  key={status}
                  style={ticketBoardColumnStyle(status)}
                  className={cn(
                    'flex min-w-[14rem] flex-1 flex-col rounded-xl',
                    dropTargetStatus === status && isValidDropTarget(status) && 'ring-2 ring-primary/40',
                    dropTargetStatus === status && !isValidDropTarget(status) && 'ring-2 ring-destructive/40',
                  )}
                  aria-label={String(t(`tickets.status.${status}`, { defaultValue: status }))}
                >
                  <header style={ticketBoardColumnHeaderStyle(status)} className="relative flex items-center justify-center rounded-t-[0.65rem] px-3 py-2.5">
                    <TicketStatusBadge status={status} />
                    <span className="absolute right-3 text-xs font-semibold tabular-nums text-muted-foreground">{columnTickets.length}</span>
                  </header>
                  <div
                    className={cn(
                      'flex flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors',
                      dropTargetStatus === status && isValidDropTarget(status) && 'bg-primary/5',
                      dropTargetStatus === status && !isValidDropTarget(status) && 'bg-destructive/5',
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = isValidDropTarget(status) ? 'move' : 'none';
                      setDropTargetStatus(status);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setDropTargetStatus((current) => current === status ? null : current);
                      }
                    }}
                    onDrop={(event) => handleDrop(event, status)}
                  >
                    {columnTickets.length === 0 ? (
                      <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                        {draggingTicketId ? t('tickets.board.dropHere') : t('tickets.board.emptyColumn')}
                      </p>
                    ) : columnTickets.map((ticket) => (
                      <TicketBoardCard
                        key={ticket.id}
                        ticket={ticket}
                        showSla={showSla}
                        isDragging={draggingTicketId === ticket.id}
                        isUpdating={updatingTicketId === ticket.id}
                        onDragStart={setDraggingTicketId}
                        onDragEnd={() => {
                          setDraggingTicketId(null);
                          setDropTargetStatus(null);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
