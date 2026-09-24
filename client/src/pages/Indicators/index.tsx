import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import useGetTicketStats, {
  TICKET_STATS_GROUPS,
  TICKET_STATS_PRESET_PERIODS,
  type TicketStatsGroup,
  type TicketStatsPeriod,
  type TicketStatsQuery,
} from '~/api/ticket/getTicketStats';
import { Button } from '~/components/ui/button';
import { csvTimestamp, downloadCsv } from '~/lib/csvExport';
import { buildTicketsCsv, fetchTicketsForExport } from '~/lib/ticketsCsvExport';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import DashboardPeriodFilter from '~/pages/Indicators/DashboardPeriodFilter';
import StaffDashboardSla from '~/pages/Indicators/StaffDashboardSla';

function parseGroup(raw: string | null): TicketStatsGroup {
  if (raw && (TICKET_STATS_GROUPS as readonly string[]).includes(raw)) {
    return raw as TicketStatsGroup;
  }
  return 'overall';
}

function parsePeriod(raw: string | null): TicketStatsPeriod {
  if (raw === 'custom') return 'custom';
  if (
    raw &&
    (TICKET_STATS_PRESET_PERIODS as readonly string[]).includes(raw)
  ) {
    return raw as TicketStatsPeriod;
  }
  return 'last_15_days';
}

function parseQueryFromSearch(params: URLSearchParams): TicketStatsQuery {
  const period = parsePeriod(params.get('period'));
  const sectorId = params.get('sectorId')?.trim() || undefined;
  if (period === 'custom') {
    const from = params.get('from') || undefined;
    const to = params.get('to') || undefined;
    return { period, from, to, sectorId };
  }
  return { period, sectorId };
}

function writeQueryToSearch(
  params: URLSearchParams,
  query: TicketStatsQuery,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (query.period === 'last_15_days') {
    next.delete('period');
  } else {
    next.set('period', query.period);
  }
  if (query.period === 'custom' && query.from && query.to) {
    next.set('from', query.from);
    next.set('to', query.to);
  } else {
    next.delete('from');
    next.delete('to');
  }
  if (query.sectorId) {
    next.set('sectorId', query.sectorId);
  } else {
    next.delete('sectorId');
  }
  return next;
}

function resolveExportCreatedRange(
  query: TicketStatsQuery,
  statsDateFrom?: string | null,
  statsDateTo?: string | null,
): { createdFrom: string; createdTo: string } | null {
  if (query.period === 'custom') {
    if (!query.from || !query.to) return null;
    return { createdFrom: query.from, createdTo: query.to };
  }
  if (statsDateFrom && statsDateTo) {
    return { createdFrom: statsDateFrom, createdTo: statsDateTo };
  }
  return null;
}

export default function Indicators() {
  const { t } = useTranslation();
  const { showSuccessSnack, showErrorSnack } = useAlertStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const query = parseQueryFromSearch(searchParams);
  const group = parseGroup(searchParams.get('group'));
  const { stats } = useGetTicketStats(query, true);

  const setGroup = (next: TicketStatsGroup) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'overall') {
      params.delete('group');
    } else {
      params.set('group', next);
    }
    setSearchParams(params, { replace: true });
  };

  const setQuery = (next: TicketStatsQuery) => {
    setSearchParams(writeQueryToSearch(searchParams, next), { replace: true });
  };

  const onExportCsv = async () => {
    if (isExporting) return;
    const range = resolveExportCreatedRange(query, stats?.dateFrom, stats?.dateTo);
    if (!range) return;

    setIsExporting(true);
    try {
      const { items, truncated } = await fetchTicketsForExport({
        includeClosed: true,
        createdFrom: range.createdFrom,
        createdTo: range.createdTo,
        sectorId: query.sectorId,
      });
      downloadCsv(`hopdesk-indicadores-${csvTimestamp()}.csv`, buildTicketsCsv(items));
      if (truncated) {
        showSuccessSnack(
          t('indicators.exportTruncated', { count: items.length }),
        );
      } else {
        showSuccessSnack(t('indicators.exportSuccess', { count: items.length }));
      }
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('indicators.exportError')));
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = Boolean(
    resolveExportCreatedRange(query, stats?.dateFrom, stats?.dateTo),
  );

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('indicators.title')}
          </h1>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <DashboardPeriodFilter value={query} onChange={setQuery} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={!canExport || isExporting}
              onClick={() => void onExportCsv()}
            >
              {isExporting ? t('indicators.exporting') : t('indicators.exportCsv')}
            </Button>
          </div>
        </div>
      </div>

      <StaffDashboardSla
        query={query}
        group={group}
        onGroupChange={setGroup}
      />
    </div>
  );
}
