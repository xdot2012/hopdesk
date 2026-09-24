import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_QUEUE_FINISHED_PERIOD,
} from '~/api/ticket/listTickets';
import useListTickets from '~/api/ticket/listTickets';
import EmptyState from '~/components/EmptyState';
import TicketBoard from '~/pages/Tickets/TicketBoard';
import TicketList from '~/pages/Tickets/TicketList';
import TicketQueueToolbar, {
  EMPTY_TICKET_QUEUE_FILTERS,
  filterTicketQueue,
  type TicketQueueFilterState,
} from '~/pages/Tickets/TicketQueueToolbar';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { DASHBOARD } from '~/router/paths';
import { useUserStore } from '~/store';
import { isAgentRole, isCustomerRole } from '~/util/roles';

const BOARD_PAGE_SIZE = 100;
const LAYOUT_STORAGE_KEY = 'hopdesk.tickets.layout';

export type TicketsLayout = 'list' | 'board';

function parseLayout(raw: string | null): TicketsLayout | null {
  if (raw === 'list' || raw === 'board') return raw;
  return null;
}

function readStoredLayout(): TicketsLayout {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    const parsed = parseLayout(stored);
    if (parsed) return parsed;
  } catch {
    // ignore
  }
  return 'board';
}

export default function TicketsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isProfileSet } = useUserStore();
  const agent = isAgentRole(profile?.role);
  const customer = isProfileSet && isCustomerRole(profile?.role);
  const profileId = profile?.id;

  const layoutFromUrl = parseLayout(searchParams.get('layout'));
  const layout = layoutFromUrl ?? readStoredLayout();

  const [filters, setFilters] = useState<TicketQueueFilterState>(EMPTY_TICKET_QUEUE_FILTERS);

  const listParams = useMemo(
    () => ({
      finishedPeriod: DEFAULT_QUEUE_FINISHED_PERIOD,
      page: 1,
      size: BOARD_PAGE_SIZE,
    }),
    [],
  );

  const { tickets } = useListTickets(listParams);

  const filteredTickets = useMemo(
    () => filterTicketQueue(tickets, filters, profileId),
    [tickets, filters, profileId],
  );

  const setLayout = (next: TicketsLayout) => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const params = new URLSearchParams(searchParams);
    if (next === 'board') {
      params.delete('layout');
    } else {
      params.set('layout', next);
    }
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    for (const key of ['finished', 'view', 'page', 'period'] as const) {
      if (params.get(key)) {
        params.delete(key);
        changed = true;
      }
    }

    const layoutParam = params.get('layout');
    if (layoutParam && layoutParam !== 'list' && layoutParam !== 'board') {
      params.delete('layout');
      changed = true;
    }

    if (!layoutParam && layoutFromUrl == null) {
      const stored = readStoredLayout();
      if (stored === 'list') {
        params.set('layout', 'list');
        changed = true;
      }
    }

    if (changed) {
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, layoutFromUrl]);

  useEffect(() => {
    if (customer) {
      // Preserve overlay params (e.g. ?kb=) when a staff link lands on /tickets.
      navigate(
        { pathname: DASHBOARD, search: location.search, hash: location.hash },
        { replace: true },
      );
    }
  }, [customer, location.hash, location.search, navigate]);

  if (customer) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {agent ? t('tickets.queueTitle') : t('tickets.myTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {agent ? t('tickets.queueSubtitle') : t('tickets.mySubtitle')}
          </p>
        </div>
        <Tabs value={layout} onValueChange={(value) => setLayout(value as TicketsLayout)}>
          <TabsList
            className="h-9 w-full justify-start sm:w-auto"
            aria-label={t('tickets.layout.label')}
          >
            <TabsTrigger value="list" className="gap-1.5 px-2.5 text-xs sm:text-sm">
              <List className="h-3.5 w-3.5" aria-hidden />
              {t('tickets.layout.list')}
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5 px-2.5 text-xs sm:text-sm">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              {t('tickets.layout.board')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TicketQueueToolbar value={filters} onChange={setFilters} />

      {tickets.length === 0 ? (
        <EmptyState title={t('tickets.empty')} />
      ) : filteredTickets.length === 0 ? (
        <EmptyState title={t('tickets.noResults')} />
      ) : layout === 'list' ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <TicketList
            tickets={filteredTickets}
            showSla={agent}
            showAssignee
            showRequester={agent}
            showSearch={false}
            emptyMessage={t('tickets.noResults')}
          />
        </div>
      ) : (
        <TicketBoard
          tickets={filteredTickets}
          showSla={agent}
          emptyMessage={t('tickets.noResults')}
        />
      )}
    </div>
  );
}
