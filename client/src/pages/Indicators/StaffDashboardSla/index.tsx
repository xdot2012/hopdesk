import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useGetTicketStats, {
  type TicketStatsGroup,
  type TicketStatsQuery,
} from '~/api/ticket/getTicketStats';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  buildChartModel,
  formatMinutes,
  SERIES_COLORS,
  TOOLTIP_CURSOR_LINE,
} from './chartModel';
import ChartTooltip from './ChartTooltip';
import DailyBarChart from './DailyBarChart';
import EmptyChartMessage from './EmptyChartMessage';
import KpiCard from './KpiCard';
import SectionLoading from './SectionLoading';
import SlaCompliancePanel from './SlaCompliancePanel';
import SlaGroupSelector from './SlaGroupSelector';

type Props = {
  query: TicketStatsQuery;
  group: TicketStatsGroup;
  onGroupChange: (next: TicketStatsGroup) => void;
};

function formatSlaRate(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${rate}%`;
}

export default function StaffDashboardSla({
  query,
  group,
  onGroupChange,
}: Props) {
  const { t, i18n } = useTranslation();
  const { stats, isLoading, error } = useGetTicketStats(query, true);
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';

  const emptyMessage = t('dashboard.sla.emptyChart');

  const chartModel = useMemo(() => {
    if (!stats) return null;
    return buildChartModel(stats, group, locale, {
      seriesFirstResponse: t('dashboard.sla.seriesFirstResponse'),
      seriesResolution: t('dashboard.sla.seriesResolution'),
      seriesOpened: t('dashboard.sla.seriesOpened'),
      seriesClosed: t('dashboard.sla.seriesClosed'),
      seriesSlaFulfilled: t('dashboard.sla.kpiFulfilled'),
      seriesSlaFailed: t('dashboard.sla.kpiFailed'),
      others: t('dashboard.sla.others'),
      formatOthers: (names: string[]) =>
        names.length === 0
          ? t('dashboard.sla.others')
          : t('dashboard.sla.othersWithNames', {
              names: names.join(', '),
            }),
      unassigned: t('dashboard.sla.emptyLabels.unassigned'),
      none: t('dashboard.sla.emptyLabels.none'),
      priority: {
        low: String(t('tickets.priorityCode.low')),
        medium: String(t('tickets.priorityCode.medium')),
        high: String(t('tickets.priorityCode.high')),
        urgent: String(t('tickets.priorityCode.urgent')),
      },
    });
  }, [stats, group, locale, t]);

  if (isLoading && !stats) {
    return <SectionLoading />;
  }

  if (error || !stats || !chartModel) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {t('dashboard.sla.loadError')}
      </p>
    );
  }

  const slaPanelTitle = chartModel.slaGaugesGrouped
    ? t('dashboard.sla.complianceByGroupTitle', {
        group: t(`dashboard.sla.groups.${group}`),
      })
    : t('indicators.title');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label={t('dashboard.sla.kpiTicketsPeriod')}
          value={stats.total}
        />
        <KpiCard
          label={t('dashboard.sla.kpiOpen')}
          value={stats.openCount}
        />
        <KpiCard
          label={t('dashboard.sla.kpiAvgResponseShort')}
          value={formatMinutes(stats.avgFirstResponseMinutes)}
        />
        <KpiCard
          label={t('dashboard.sla.kpiSlaFirstResponse')}
          value={formatSlaRate(stats.firstResponseSla?.rate)}
        />
        <KpiCard
          label={t('dashboard.sla.kpiSlaResolution')}
          value={formatSlaRate(stats.resolutionSla?.rate)}
        />
      </div>

      <SlaGroupSelector value={group} onChange={onGroupChange} />

      <SlaCompliancePanel
        title={slaPanelTitle}
        items={chartModel.slaGauges}
        grouped={chartModel.slaGaugesGrouped}
        emptyMessage={emptyMessage}
        firstResponseLabel={t('dashboard.sla.gaugeFirstResponseShort')}
        resolutionLabel={t('dashboard.sla.gaugeResolutionShort')}
        withinLabel={t('dashboard.sla.slaWithin')}
        outsideLabel={t('dashboard.sla.slaOutside')}
      />

      <div className="grid gap-2.5 lg:grid-cols-2">
        <DailyBarChart
          title={t('dashboard.sla.openedByDayTitle')}
          empty={chartModel.opened.empty}
          emptyMessage={emptyMessage}
          rows={chartModel.opened.rows}
          series={chartModel.opened.series}
        />
        <DailyBarChart
          title={t('dashboard.sla.closedByDayTitle')}
          empty={chartModel.closed.empty}
          emptyMessage={emptyMessage}
          rows={chartModel.closed.rows}
          series={chartModel.closed.series}
        />
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-0.5 p-3 pb-1.5">
            <CardTitle className="text-sm md:text-base">
              {t('dashboard.sla.avgTimeTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="h-[min(14rem,28vh)]">
              {chartModel.avgTimeEmpty ? (
                <EmptyChartMessage message={emptyMessage} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartModel.avgTimeRows}
                    margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                    />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={TOOLTIP_CURSOR_LINE}
                    />
                    {chartModel.avgTimeSeries.map((series, index) => (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        name={series.label}
                        stroke={
                          series.color ??
                          SERIES_COLORS[index % SERIES_COLORS.length]
                        }
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <DailyBarChart
          title={t('dashboard.sla.slaByDayTitle')}
          empty={chartModel.slaByDay.empty}
          emptyMessage={emptyMessage}
          rows={chartModel.slaByDay.rows}
          series={chartModel.slaByDay.series}
        />
      </div>
    </div>
  );
}
