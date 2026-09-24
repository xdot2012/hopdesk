import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useListTickets, {
  type ListTicketsParams,
} from '~/api/ticket/listTickets';
import TicketList from '~/pages/Tickets/TicketList';
import TicketQueueToolbar, {
  EMPTY_TICKET_QUEUE_FILTERS,
  UNASSIGNED_ASSIGNEE,
  hasActiveTicketFilters,
  type TicketQueueFilterState,
} from '~/pages/Tickets/TicketQueueToolbar';
import { Button } from '~/components/ui/button';
import useUrlPagination from '~/hooks/useUrlPagination';
import { csvTimestamp, downloadCsv } from '~/lib/csvExport';
import { buildTicketsCsv, fetchTicketsForExport } from '~/lib/ticketsCsvExport';
import { DASHBOARD } from '~/router/paths';
import { useAlertStore, useTicketDetailDialogStore, useUserStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import { isAgentRole, isCustomerRole } from '~/util/roles';

const HISTORY_PAGE_SIZE = 20;

function parseTicketNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildHistoryListParams(
  filters: TicketQueueFilterState,
  profileId: string | null | undefined,
  page?: number,
  size?: number,
): ListTicketsParams {
  const assignedToMe = Boolean(filters.assignedToMe && profileId);
  const assigneeId = assignedToMe ? profileId! : filters.assigneeId;
  const unassigned = assigneeId === UNASSIGNED_ASSIGNEE;

  return {
    finishedOnly: true,
    search: filters.search.trim() || undefined,
    number: parseTicketNumber(filters.number),
    externalId: filters.externalId.trim() || undefined,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    finishedFrom: filters.finishedFrom || undefined,
    finishedTo: filters.finishedTo || undefined,
    assigneeUserId: unassigned || !assigneeId ? undefined : assigneeId,
    unassigned: unassigned || undefined,
    requesterUserId: filters.requesterId || undefined,
    priorityCode: filters.priorityCode || undefined,
    page,
    size,
  };
}

export default function TicketsHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isProfileSet } = useUserStore();
  const { showSuccessSnack, showErrorSnack } = useAlertStore();
  const agent = isAgentRole(profile?.role);
  const customer = isProfileSet && isCustomerRole(profile?.role);
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);
  const { page, pageIndex, setPageIndex, resetPage } = useUrlPagination();
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<TicketQueueFilterState>(EMPTY_TICKET_QUEUE_FILTERS);

  const hasActiveFilters = hasActiveTicketFilters(filters, { includeFinishedDate: true });

  const filterKey = [
    filters.search,
    filters.number,
    filters.externalId,
    filters.assigneeId,
    filters.requesterId,
    filters.priorityCode,
    filters.assignedToMe,
    filters.createdFrom,
    filters.createdTo,
    filters.finishedFrom,
    filters.finishedTo,
  ].join('|');
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    resetPage();
  }, [filterKey, resetPage]);

  useEffect(() => {
    if (customer) {
      navigate(
        { pathname: DASHBOARD, search: location.search, hash: location.hash },
        { replace: true },
      );
    }
  }, [customer, location.hash, location.search, navigate]);

  const listParams = useMemo(
    () => buildHistoryListParams(filters, profile?.id, page, HISTORY_PAGE_SIZE),
    [filters, profile?.id, page],
  );

  const { tickets, pages } = useListTickets(listParams);

  const onExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { items, truncated } = await fetchTicketsForExport(
        buildHistoryListParams(filters, profile?.id),
      );
      downloadCsv(`hopdesk-historico-${csvTimestamp()}.csv`, buildTicketsCsv(items));
      if (truncated) {
        showSuccessSnack(
          t('tickets.history.exportTruncated', { count: items.length }),
        );
      } else {
        showSuccessSnack(t('tickets.history.exportSuccess', { count: items.length }));
      }
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('tickets.history.exportError')),
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (customer) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {t('tickets.history.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('tickets.history.subtitle')}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          disabled={isExporting}
          onClick={() => void onExportCsv()}
        >
          {isExporting ? t('tickets.history.exporting') : t('tickets.history.exportCsv')}
        </Button>
      </div>

      <TicketQueueToolbar value={filters} onChange={setFilters} showFinishedDate />

      <div className="min-h-0 flex-1 overflow-auto">
        <TicketList
          tickets={tickets}
          showSla={agent}
          showAssignee
          showRequester={agent}
          showExternalId
          showSearch={false}
          onTicketClick={openTicket}
          emptyMessage={
            hasActiveFilters ? t('tickets.noResults') : t('tickets.history.empty')
          }
          manualPagination
          pageIndex={pageIndex}
          pageCount={Math.max(pages, 1)}
          pageSize={HISTORY_PAGE_SIZE}
          onPageChange={setPageIndex}
        />
      </div>
    </div>
  );
}
