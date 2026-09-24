import type {
  TicketStats,
  TicketStatsGroup,
} from '~/api/ticket/getTicketStats';
import { ticketPriorityChartColor } from '~/lib/ticketVisuals';

export const TOOLTIP_CURSOR_FILL = {
  fill: 'color-mix(in oklch, var(--foreground) 10%, transparent)',
} as const;

export const TOOLTIP_CURSOR_LINE = {
  stroke: 'var(--border)',
  strokeWidth: 1,
} as const;

export const SERIES_COLORS = [
  'var(--chart-volume)',
  'var(--chart-sla-resolution)',
  'var(--chart-testing)',
  'var(--chart-triage)',
  'var(--chart-waiting)',
  'var(--chart-open)',
  'var(--chart-closed)',
];

/** Fixed red for closed tickets / SLA failures. */
export const ALERT_LINE_COLOR = 'var(--chart-sla-failed)';

const TOP_GROUP_SERIES = 5;
const OTHERS_KEY = '__others__';
const OTHERS_COLOR = 'var(--muted-foreground)';

function seriesColorAt(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function buildSectorColorMap(stats: TicketStats): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of stats.bySector ?? []) {
    if (item.color) map.set(item.key, item.color);
  }
  return map;
}

/** Priority tokens, sector API colors, or rotating SERIES_COLORS. */
function resolveGroupSeriesColor(
  group: TicketStatsGroup,
  key: string,
  index: number,
  sectorColors: Map<string, string>,
): string {
  if (key === OTHERS_KEY) return OTHERS_COLOR;
  if (group === 'priority') return ticketPriorityChartColor(key);
  if (group === 'sector') {
    return sectorColors.get(key) ?? seriesColorAt(index);
  }
  return seriesColorAt(index);
}

export function formatMinutes(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value < 60) return `${Math.round(value)} min`;
  return `${(value / 60).toFixed(1)} h`;
}

function formatDayLabel(dateKey: string, locale: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
}

function pickTopGroupKeys(
  buckets: { key: string; opened?: number; closed?: number; fulfilledCount?: number }[],
  includeAll = false,
): string[] {
  if (includeAll) {
    return buckets.map((item) => item.key);
  }
  const ranked = [...buckets].sort((a, b) => {
    const scoreA = (a.opened ?? 0) + (a.closed ?? 0) + (a.fulfilledCount ?? 0);
    const scoreB = (b.opened ?? 0) + (b.closed ?? 0) + (b.fulfilledCount ?? 0);
    return scoreB - scoreA;
  });
  return ranked.slice(0, TOP_GROUP_SERIES).map((item) => item.key);
}

export type SeriesDef = { key: string; label: string; color?: string };

type DaySeries = {
  rows: Record<string, string | number>[];
  series: SeriesDef[];
  empty: boolean;
};

export type SlaGaugeCounts = {
  fulfilled: number;
  failed: number;
};

export type SlaGaugeItem = {
  key: string;
  label: string | null;
  color?: string;
  firstResponse: SlaGaugeCounts;
  resolution: SlaGaugeCounts;
};

export type ChartModel = {
  avgTimeRows: Record<string, string | number>[];
  avgTimeSeries: SeriesDef[];
  avgTimeEmpty: boolean;
  opened: DaySeries;
  closed: DaySeries;
  slaByDay: DaySeries;
  slaGauges: SlaGaugeItem[];
  slaGaugesGrouped: boolean;
  breakdown: {
    key: string;
    label: string;
    opened: number;
    closed: number;
    fulfilledCount: number;
    failedCount: number;
    fulfillmentRate?: number | null;
  }[];
};

function outcomeToCounts(
  outcome: { fulfilledCount?: number; failedCount?: number } | null | undefined,
): SlaGaugeCounts {
  return {
    fulfilled: outcome?.fulfilledCount ?? 0,
    failed: outcome?.failedCount ?? 0,
  };
}

type LabelsFixed = {
  seriesFirstResponse: string;
  seriesResolution: string;
  seriesOpened: string;
  seriesClosed: string;
  seriesSlaFulfilled: string;
  seriesSlaFailed: string;
  others: string;
  formatOthers: (names: string[]) => string;
  unassigned: string;
  none: string;
  /** Display names for priority codes (e.g. from tickets.priorityCode.*). */
  priority?: Record<string, string>;
};

function titleCaseLabel(label: string): string {
  if (!label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function resolveBucketLabel(
  label: string,
  labelsFixed: Pick<LabelsFixed, 'unassigned' | 'none' | 'priority'>,
  group?: TicketStatsGroup,
): string {
  if (label === 'unassigned') return labelsFixed.unassigned;
  if (label === 'none') return labelsFixed.none;
  if (group === 'priority') {
    return labelsFixed.priority?.[label] ?? titleCaseLabel(label);
  }
  return label;
}

function collectOtherNames(
  buckets: { key: string; label: string }[],
  topKeys: string[],
  labelsFixed: Pick<LabelsFixed, 'unassigned' | 'none' | 'priority'>,
  group: TicketStatsGroup,
): string[] {
  const topSet = new Set(topKeys);
  return buckets
    .filter((item) => !topSet.has(item.key))
    .map((item) => resolveBucketLabel(item.label, labelsFixed, group));
}

function buildGroupedSlaGauges(
  buckets: {
    key: string;
    label: string;
    firstResponseSla?: { fulfilledCount: number; failedCount: number };
    resolutionSla?: { fulfilledCount: number; failedCount: number };
  }[],
  topKeys: string[],
  labelsFixed: Pick<
    LabelsFixed,
    'others' | 'formatOthers' | 'unassigned' | 'none' | 'priority'
  >,
  group: TicketStatsGroup,
  colorForKey?: (key: string, index: number) => string | undefined,
): SlaGaugeItem[] {
  const topSet = new Set(topKeys);
  const byKey = new Map(buckets.map((item) => [item.key, item]));
  const items: SlaGaugeItem[] = topKeys.map((key, index) => {
    const bucket = byKey.get(key);
    return {
      key,
      label: bucket
        ? resolveBucketLabel(bucket.label, labelsFixed, group)
        : resolveBucketLabel(key, labelsFixed, group),
      color: colorForKey?.(key, index),
      firstResponse: outcomeToCounts(bucket?.firstResponseSla),
      resolution: outcomeToCounts(bucket?.resolutionSla),
    };
  });

  let othersFr = 0;
  let othersFrFail = 0;
  let othersRes = 0;
  let othersResFail = 0;
  let hasOthers = false;
  const otherNameSet = new Set<string>();
  for (const bucket of buckets) {
    if (topSet.has(bucket.key)) continue;
    const fr = outcomeToCounts(bucket.firstResponseSla);
    const res = outcomeToCounts(bucket.resolutionSla);
    if (fr.fulfilled + fr.failed + res.fulfilled + res.failed === 0) continue;
    hasOthers = true;
    otherNameSet.add(resolveBucketLabel(bucket.label, labelsFixed, group));
    othersFr += fr.fulfilled;
    othersFrFail += fr.failed;
    othersRes += res.fulfilled;
    othersResFail += res.failed;
  }
  if (hasOthers) {
    items.push({
      key: OTHERS_KEY,
      label: labelsFixed.formatOthers([...otherNameSet]),
      color: colorForKey?.(OTHERS_KEY, topKeys.length),
      firstResponse: { fulfilled: othersFr, failed: othersFrFail },
      resolution: { fulfilled: othersRes, failed: othersResFail },
    });
  }
  return items;
}

function isSeriesEmpty(
  rows: Record<string, string | number>[],
  seriesKeys: string[],
): boolean {
  return !rows.some((row) =>
    seriesKeys.some((key) => Number(row[key] ?? 0) > 0),
  );
}

function buildGroupedMetricRows<T extends { key: string }>(
  days: { date: string; byGroup: T[] }[],
  topKeys: string[],
  labelDay: (date: string) => string,
  readValue: (item: T) => number,
): { rows: Record<string, string | number>[]; hasOthers: boolean } {
  const topSet = new Set(topKeys);
  let hasOthers = false;
  const rows = days.map((day) => {
    const row: Record<string, string | number> = {
      date: day.date,
      label: labelDay(day.date),
    };
    let others = 0;
    let sawOthers = false;
    for (const item of day.byGroup) {
      const value = readValue(item);
      if (topSet.has(item.key)) {
        row[item.key] = value;
      } else {
        others += value;
        sawOthers = true;
      }
    }
    for (const key of topKeys) {
      if (row[key] == null) row[key] = 0;
    }
    if (sawOthers) {
      row[OTHERS_KEY] = others;
      hasOthers = true;
    }
    return row;
  });
  return { rows, hasOthers };
}

function buildSlaByDaySeries(
  stats: TicketStats,
  locale: string,
  labelsFixed: { seriesSlaFulfilled: string; seriesSlaFailed: string },
): DaySeries {
  const labelDay = (date: string) => formatDayLabel(date, locale);
  const rows = (stats.slaComplianceByDay ?? []).map((day) => ({
    date: day.date,
    label: labelDay(day.date),
    fulfilled: day.fulfilledCount,
    failed: day.failedCount,
  }));
  return {
    rows,
    series: [
      {
        key: 'fulfilled',
        label: labelsFixed.seriesSlaFulfilled,
        color: 'var(--chart-sla-ok)',
      },
      {
        key: 'failed',
        label: labelsFixed.seriesSlaFailed,
        color: ALERT_LINE_COLOR,
      },
    ],
    empty: isSeriesEmpty(rows, ['fulfilled', 'failed']),
  };
}

export function buildChartModel(
  stats: TicketStats,
  group: TicketStatsGroup,
  locale: string,
  labelsFixed: LabelsFixed,
): ChartModel {
  const labelDay = (date: string) => formatDayLabel(date, locale);
  const slaByDay = buildSlaByDaySeries(stats, locale, labelsFixed);

  if (group === 'overall') {
    const avgTimeRows = (stats.avgTimeByDay ?? []).map((day) => ({
      date: day.date,
      label: labelDay(day.date),
      firstResponse: day.avgFirstResponseMinutes ?? 0,
      resolution: day.avgResolutionMinutes ?? 0,
    }));
    const openedRows = (stats.openClosedByDay ?? []).map((day) => ({
      date: day.date,
      label: labelDay(day.date),
      opened: day.opened,
    }));
    const closedRows = (stats.openClosedByDay ?? []).map((day) => ({
      date: day.date,
      label: labelDay(day.date),
      closed: day.closed,
    }));
    const overallFr = outcomeToCounts(stats.firstResponseSla);
    const overallRes = outcomeToCounts(stats.resolutionSla);

    return {
      avgTimeRows,
      avgTimeSeries: [
        { key: 'firstResponse', label: labelsFixed.seriesFirstResponse },
        { key: 'resolution', label: labelsFixed.seriesResolution },
      ],
      avgTimeEmpty: !avgTimeRows.some(
        (row) => Number(row.firstResponse) > 0 || Number(row.resolution) > 0,
      ),
      opened: {
        rows: openedRows,
        series: [{ key: 'opened', label: labelsFixed.seriesOpened }],
        empty: isSeriesEmpty(openedRows, ['opened']),
      },
      closed: {
        rows: closedRows,
        series: [
          {
            key: 'closed',
            label: labelsFixed.seriesClosed,
            color: ALERT_LINE_COLOR,
          },
        ],
        empty: isSeriesEmpty(closedRows, ['closed']),
      },
      slaByDay,
      slaGauges: [
        {
          key: 'overall',
          label: null,
          firstResponse: overallFr,
          resolution: overallRes,
        },
      ],
      slaGaugesGrouped: false,
      breakdown: [],
    };
  }

  const buckets = stats.byGroup?.[group] ?? [];
  const includeAllGroups =
    group === 'sector' || group === 'requester' || group === 'agent';
  const topKeys = pickTopGroupKeys(buckets, includeAllGroups);
  const sectorColors = group === 'sector' ? buildSectorColorMap(stats) : new Map();
  const colorForKey = (key: string, index: number) =>
    resolveGroupSeriesColor(group, key, index, sectorColors);
  const labels: Record<string, string> = Object.fromEntries(
    buckets.map((item) => [
      item.key,
      resolveBucketLabel(item.label, labelsFixed, group),
    ]),
  );
  labels[OTHERS_KEY] = labelsFixed.formatOthers(
    collectOtherNames(buckets, topKeys, labelsFixed, group),
  );

  const avgDays = stats.avgTimeByDayByGroup?.[group] ?? [];
  const avgTimeRows = avgDays.map((day) => {
    const row: Record<string, string | number> = {
      date: day.date,
      label: labelDay(day.date),
    };
    const topSet = new Set(topKeys);
    let others = 0;
    let othersCount = 0;
    for (const item of day.byGroup) {
      const value = item.avgResolutionMinutes ?? item.avgFirstResponseMinutes ?? 0;
      if (topSet.has(item.key)) {
        row[item.key] = value;
      } else if (value > 0) {
        others += value;
        othersCount += 1;
      }
    }
    for (const key of topKeys) {
      if (row[key] == null) row[key] = 0;
    }
    if (othersCount > 0) {
      row[OTHERS_KEY] = others / othersCount;
    }
    return row;
  });

  const openDays = stats.openClosedByDayByGroup?.[group] ?? [];
  const openedBuilt = buildGroupedMetricRows(
    openDays,
    topKeys,
    labelDay,
    (item) => item.opened ?? item.count ?? 0,
  );
  const closedBuilt = buildGroupedMetricRows(
    openDays,
    topKeys,
    labelDay,
    (item) => item.closed ?? 0,
  );

  const hasOthers =
    openedBuilt.hasOthers ||
    closedBuilt.hasOthers ||
    avgTimeRows.some((row) => OTHERS_KEY in row);

  const seriesKeys = [...topKeys, ...(hasOthers ? [OTHERS_KEY] : [])];
  const barSeries: SeriesDef[] = seriesKeys.map((key, index) => ({
    key,
    label: labels[key] ?? key,
    color: colorForKey(key, index),
  }));

  const useGroupColorsOnSla = group === 'priority' || group === 'sector';

  return {
    avgTimeRows,
    avgTimeSeries: barSeries,
    avgTimeEmpty: !avgTimeRows.some((row) =>
      seriesKeys.some((key) => Number(row[key] ?? 0) > 0),
    ),
    opened: {
      rows: openedBuilt.rows,
      series: barSeries,
      empty: isSeriesEmpty(openedBuilt.rows, seriesKeys),
    },
    closed: {
      rows: closedBuilt.rows,
      series: barSeries,
      empty: isSeriesEmpty(closedBuilt.rows, seriesKeys),
    },
    slaByDay,
    slaGauges: buildGroupedSlaGauges(
      buckets,
      topKeys,
      labelsFixed,
      group,
      useGroupColorsOnSla ? colorForKey : undefined,
    ),
    slaGaugesGrouped: true,
    breakdown: buckets.map((item) => ({
      key: item.key,
      label: labels[item.key] ?? resolveBucketLabel(item.label, labelsFixed, group),
      opened: item.opened,
      closed: item.closed,
      fulfilledCount: item.fulfilledCount,
      failedCount: item.failedCount,
      fulfillmentRate: item.fulfillmentRate,
    })),
  };
}
