import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useListSectors from '~/api/sector/listSectors';
import {
  MAX_TICKET_STATS_PERIOD_DAYS,
  TICKET_STATS_PRESET_PERIODS,
  type TicketStatsPeriod,
  type TicketStatsQuery,
} from '~/api/ticket/getTicketStats';
import DateRangePicker, { type DateRangeValue } from '~/components/DateRangePicker';
import SelectField from '~/components/SelectField';

const ALL_SECTORS = '';

function isoDate(day: Date): string {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function daysAgoIso(days: number): string {
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  day.setDate(day.getDate() - days);
  return isoDate(day);
}

function todayIso(): string {
  return isoDate(new Date());
}

export function defaultStatsQuery(): TicketStatsQuery {
  return { period: 'last_15_days' };
}

type Props = {
  value: TicketStatsQuery;
  onChange: (next: TicketStatsQuery) => void;
};

export default function DashboardPeriodFilter({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { sectors } = useListSectors();
  const [draftRange, setDraftRange] = useState<DateRangeValue>({
    from: value.from ?? daysAgoIso(14),
    to: value.to ?? todayIso(),
  });
  const [rangeOpen, setRangeOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const periodOptions = useMemo(
    () => [
      ...TICKET_STATS_PRESET_PERIODS.map((period) => ({
        value: period,
        label: String(t(`dashboard.overview.periods.${period}`)),
      })),
      {
        value: 'custom' as const,
        label: String(t('dashboard.overview.periods.custom')),
      },
    ],
    [t],
  );

  const sectorOptions = useMemo(
    () => [
      {
        value: ALL_SECTORS,
        label: String(t('dashboard.overview.sectorAll')),
      },
      ...sectors.map((sector) => ({
        value: sector.id,
        label: sector.name,
      })),
    ],
    [sectors, t],
  );

  const withSector = (next: TicketStatsQuery): TicketStatsQuery => ({
    ...next,
    sectorId: value.sectorId,
  });

  const handlePeriodChange = (nextPeriod: string) => {
    const period = nextPeriod as TicketStatsPeriod;
    setLocalError(null);
    if (period === 'custom') {
      const from = value.period === 'custom' ? value.from : draftRange.from || daysAgoIso(14);
      const to = value.period === 'custom' ? value.to : draftRange.to || todayIso();
      setDraftRange({ from, to });
      setRangeOpen(true);
      return;
    }
    setRangeOpen(false);
    onChange(withSector({ period }));
  };

  const handleSectorChange = (sectorId: string) => {
    onChange({
      ...value,
      sectorId: sectorId || undefined,
    });
  };

  const handleRangeChange = (range: DateRangeValue) => {
    setDraftRange(range);
    if (!range.from || !range.to) {
      return;
    }
    if (range.from > range.to) {
      setLocalError(t('dashboard.overview.periodErrors.order'));
      return;
    }
    if (range.to > todayIso()) {
      setLocalError(t('dashboard.overview.periodErrors.future'));
      return;
    }
    const start = new Date(`${range.from}T12:00:00`);
    const end = new Date(`${range.to}T12:00:00`);
    const dayCount =
      Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount > MAX_TICKET_STATS_PERIOD_DAYS) {
      setLocalError(
        t('dashboard.overview.periodErrors.maxDays', {
          days: MAX_TICKET_STATS_PERIOD_DAYS,
        }),
      );
      return;
    }
    setLocalError(null);
    onChange(withSector({ period: 'custom', from: range.from, to: range.to }));
  };

  const displayPeriod =
    value.period === 'custom' || rangeOpen ? 'custom' : value.period;

  const pickerValue =
    value.period === 'custom'
      ? { from: value.from, to: value.to }
      : draftRange;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <SelectField
          size="sm"
          value={value.sectorId ?? ALL_SECTORS}
          onValueChange={handleSectorChange}
          options={sectorOptions}
          className="w-full sm:w-44"
          aria-label={t('dashboard.overview.sectorLabel')}
        />
        <SelectField
          size="sm"
          value={displayPeriod}
          onValueChange={handlePeriodChange}
          options={periodOptions}
          className="w-full sm:w-44"
          aria-label={t('dashboard.overview.periodLabel')}
        />
        {displayPeriod === 'custom' ? (
          <DateRangePicker
            size="sm"
            className="w-full sm:w-56"
            value={pickerValue}
            onChange={handleRangeChange}
            open={rangeOpen}
            onOpenChange={setRangeOpen}
            maxDate={new Date()}
            placeholder={t('dashboard.overview.periodCustomPlaceholder')}
            aria-label={t('dashboard.overview.periodLabel')}
          />
        ) : null}
      </div>
      {localError ? <p className="text-xs text-destructive">{localError}</p> : null}
    </div>
  );
}
