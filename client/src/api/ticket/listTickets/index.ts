import { TICKET_PATH } from '~/api';
import useSWR from 'swr';
import type { TicketListItem } from '../types';
import http from '~/services/http';

/** Periods used on the history screen. `all` = no time cutoff. */
export const TICKET_HISTORY_FINISHED_PERIODS = [
  'all',
  'last_15_days',
  'last_30_days',
  'last_3_months',
] as const;

/** Bounded finished-period presets accepted by the queue/API time filter. */
export const TICKET_QUEUE_FINISHED_PERIODS = [
  'last_24_hours',
  'last_15_days',
  'last_30_days',
  'last_3_months',
] as const;

export type TicketFinishedPeriod = (typeof TICKET_QUEUE_FINISHED_PERIODS)[number];
export type TicketHistoryFinishedPeriod = (typeof TICKET_HISTORY_FINISHED_PERIODS)[number];

export const DEFAULT_QUEUE_FINISHED_PERIOD: TicketFinishedPeriod = 'last_24_hours';
export const DEFAULT_HISTORY_FINISHED_PERIOD: TicketHistoryFinishedPeriod = 'all';

export type TicketQueueCounts = {
  all: number;
  triage: number;
  open: number;
  waitingCustomer: number;
  unassigned: number;
  slaFailed: number;
};

export type TicketListPage = {
  items: TicketListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
  counts: TicketQueueCounts;
};

export type ListTicketsParams = {
  status?: string;
  /** @deprecated Prefer finishedPeriod */
  includeFinished?: boolean;
  /** When false, hides finished tickets. When true/omitted, uses finishedPeriod. */
  includeClosed?: boolean;
  /** When true, returns only finished tickets (optionally within finishedPeriod). */
  finishedOnly?: boolean;
  finishedPeriod?: TicketFinishedPeriod | TicketHistoryFinishedPeriod;
  number?: number;
  externalId?: string;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
  finishedFrom?: string;
  finishedTo?: string;
  assigneeUserId?: string;
  requesterUserId?: string;
  sectorId?: string;
  priorityCode?: string;
  unassigned?: boolean;
  slaFailed?: boolean;
  awaitingCustomer?: boolean;
  scope?: 'mine' | 'sector';
  /** When true, server computes queue tab counts (extra COUNTs). Default false. */
  includeCounts?: boolean;
  page?: number;
  size?: number;
};

function buildListTicketsUrl(params: ListTicketsParams = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.finishedPeriod && params.finishedPeriod !== 'all') {
    search.set('finished_period', params.finishedPeriod);
  } else if (params.includeFinished) {
    search.set('include_finished', 'true');
  }
  if (params.includeClosed === true) {
    search.set('include_closed', 'true');
  } else if (params.includeClosed === false) {
    search.set('include_closed', 'false');
  }
  if (params.finishedOnly) search.set('finished_only', 'true');
  if (params.number != null && params.number > 0) {
    search.set('number', String(params.number));
  }
  if (params.externalId?.trim()) {
    search.set('external_id', params.externalId.trim());
  }
  if (params.search?.trim()) {
    search.set('search', params.search.trim());
  }
  if (params.createdFrom) search.set('created_from', params.createdFrom);
  if (params.createdTo) search.set('created_to', params.createdTo);
  if (params.finishedFrom) search.set('finished_from', params.finishedFrom);
  if (params.finishedTo) search.set('finished_to', params.finishedTo);
  if (params.assigneeUserId) search.set('assignee_user_id', params.assigneeUserId);
  if (params.requesterUserId) search.set('requester_user_id', params.requesterUserId);
  if (params.sectorId) search.set('sector_id', params.sectorId);
  if (params.priorityCode?.trim()) {
    search.set('priority_code', params.priorityCode.trim());
  }
  if (params.unassigned) search.set('unassigned', 'true');
  if (params.slaFailed) search.set('sla_failed', 'true');
  if (params.awaitingCustomer) search.set('awaiting_customer', 'true');
  if (params.scope) search.set('scope', params.scope);
  if (params.includeCounts) search.set('include_counts', 'true');
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.size) search.set('size', String(params.size));
  const query = search.toString();
  return query ? `${TICKET_PATH}?${query}` : TICKET_PATH;
}

function useListTickets(params: ListTicketsParams = {}) {
  const url = buildListTicketsUrl(params);
  const { data, ...rest } = useSWR(
    url,
    (requestUrl: string) =>
      http.get<TicketListPage>(requestUrl, { method: 'get' }).then(({ data, status }) => ({
        data,
        status,
      })),
    { keepPreviousData: true },
  );
  const page = data?.data;
  return {
    tickets: page?.items ?? [],
    total: page?.total ?? 0,
    page: page?.page ?? params.page ?? 1,
    size: page?.size ?? params.size ?? 15,
    pages: page?.pages ?? 0,
    counts: page?.counts ?? {
      all: 0,
      triage: 0,
      open: 0,
      waitingCustomer: 0,
      unassigned: 0,
      slaFailed: 0,
    },
    ...rest,
  };
}

export default useListTickets;
export { buildListTicketsUrl };
