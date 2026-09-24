import { TICKET_STATS_PATH } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';

export type TicketStatsPeriod = 'last_15_days' | 'last_30_days' | 'custom';

export const TICKET_STATS_PRESET_PERIODS: Exclude<TicketStatsPeriod, 'custom'>[] = [
  'last_15_days',
  'last_30_days',
];

export const MAX_TICKET_STATS_PERIOD_DAYS = 90;

export type TicketStatsGroup = 'overall' | 'priority' | 'requester' | 'agent' | 'sector';

export const TICKET_STATS_GROUPS: TicketStatsGroup[] = [
  'overall',
  'priority',
  'requester',
  'agent',
  'sector',
];

export type TicketStatsQuery = {
  period: TicketStatsPeriod;
  from?: string;
  to?: string;
  sectorId?: string;
};

export type TicketCountBucket = {
  key: string;
  count: number;
};

export type TicketLabeledCountBucket = {
  key: string;
  label: string;
  count: number;
  color?: string | null;
};

export type TicketDailyCount = {
  date: string;
  count: number;
  byPriority?: TicketCountBucket[];
  bySector?: TicketLabeledCountBucket[];
};

export type TicketSlaOutcome = {
  fulfilledCount: number;
  failedCount: number;
  rate?: number | null;
};

export type TicketOpenClosedDay = {
  date: string;
  opened: number;
  closed: number;
};

export type TicketAvgTimeDay = {
  date: string;
  avgFirstResponseMinutes?: number | null;
  avgResolutionMinutes?: number | null;
};

export type TicketSlaComplianceDay = {
  date: string;
  fulfilledCount: number;
  failedCount: number;
  fulfillmentRate?: number | null;
};

export type TicketGroupBucket = {
  key: string;
  label: string;
  opened: number;
  closed: number;
  fulfilledCount: number;
  failedCount: number;
  fulfillmentRate?: number | null;
  avgFirstResponseMinutes?: number | null;
  avgResolutionMinutes?: number | null;
  firstResponseSla: TicketSlaOutcome;
  resolutionSla: TicketSlaOutcome;
};

export type TicketGroupCountBucket = {
  key: string;
  label: string;
  count: number;
  opened?: number;
  closed?: number;
};

export type TicketGroupTimeBucket = {
  key: string;
  label: string;
  avgFirstResponseMinutes?: number | null;
  avgResolutionMinutes?: number | null;
};

export type TicketGroupSlaBucket = {
  key: string;
  label: string;
  fulfilledCount: number;
  failedCount: number;
  fulfillmentRate?: number | null;
};

export type TicketOpenClosedDayByGroup = TicketOpenClosedDay & {
  byGroup: TicketGroupCountBucket[];
};

export type TicketAvgTimeDayByGroup = TicketAvgTimeDay & {
  byGroup: TicketGroupTimeBucket[];
};

export type TicketSlaComplianceDayByGroup = TicketSlaComplianceDay & {
  byGroup: TicketGroupSlaBucket[];
};

export type TicketStatsByGroup = {
  priority: TicketGroupBucket[];
  requester: TicketGroupBucket[];
  agent: TicketGroupBucket[];
  sector: TicketGroupBucket[];
};

export type TicketStatsGroupedOpenClosedSeries = {
  priority: TicketOpenClosedDayByGroup[];
  requester: TicketOpenClosedDayByGroup[];
  agent: TicketOpenClosedDayByGroup[];
  sector: TicketOpenClosedDayByGroup[];
};

export type TicketStatsAvgTimeGroupedSeries = {
  priority: TicketAvgTimeDayByGroup[];
  requester: TicketAvgTimeDayByGroup[];
  agent: TicketAvgTimeDayByGroup[];
  sector: TicketAvgTimeDayByGroup[];
};

export type TicketStatsSlaGroupedSeries = {
  priority: TicketSlaComplianceDayByGroup[];
  requester: TicketSlaComplianceDayByGroup[];
  agent: TicketSlaComplianceDayByGroup[];
  sector: TicketSlaComplianceDayByGroup[];
};

export type TicketStats = {
  total: number;
  openCount: number;
  unassignedCount: number;
  closedCount?: number;
  fulfilledCount: number;
  failedCount: number;
  fulfillmentRate?: number | null;
  avgFirstResponseMinutes?: number | null;
  avgResolutionMinutes?: number | null;
  avgSatisfaction?: number | null;
  satisfactionCount?: number;
  firstResponseSla?: TicketSlaOutcome;
  resolutionSla?: TicketSlaOutcome;
  byStatus: TicketCountBucket[];
  bySla: TicketCountBucket[];
  byPriority: TicketCountBucket[];
  byAssignee: TicketLabeledCountBucket[];
  bySector: TicketLabeledCountBucket[];
  byAging: TicketCountBucket[];
  createdByDay: TicketDailyCount[];
  openClosedByDay?: TicketOpenClosedDay[];
  avgTimeByDay?: TicketAvgTimeDay[];
  slaComplianceByDay?: TicketSlaComplianceDay[];
  byGroup?: TicketStatsByGroup;
  openClosedByDayByGroup?: TicketStatsGroupedOpenClosedSeries;
  avgTimeByDayByGroup?: TicketStatsAvgTimeGroupedSeries;
  slaComplianceByDayByGroup?: TicketStatsSlaGroupedSeries;
  period: TicketStatsPeriod;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export function buildTicketStatsSearchParams(query: TicketStatsQuery): string {
  const search = new URLSearchParams();
  search.set('period', query.period);
  if (query.period === 'custom' && query.from && query.to) {
    search.set('from', query.from);
    search.set('to', query.to);
  }
  if (query.sectorId) {
    search.set('sector_id', query.sectorId);
  }
  return search.toString();
}

export function ticketStatsQueryKey(basePath: string, query: TicketStatsQuery): string | null {
  if (query.period === 'custom' && (!query.from || !query.to)) {
    return null;
  }
  return `${basePath}?${buildTicketStatsSearchParams(query)}`;
}

function useGetTicketStats(
  query: TicketStatsQuery = { period: 'last_15_days' },
  enabled = true,
) {
  const url = enabled ? ticketStatsQueryKey(TICKET_STATS_PATH, query) : null;
  const { data, ...rest } = useImmutableQuery<TicketStats>(url, { method: 'get' });
  return { stats: data?.data ?? null, ...rest };
}

export default useGetTicketStats;
