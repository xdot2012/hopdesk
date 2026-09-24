import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import useListTickets from '~/api/ticket/listTickets';
import DateRangePicker from '~/components/DateRangePicker';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import useUrlPagination from '~/hooks/useUrlPagination';
import TicketList from '~/pages/Tickets/TicketList';
import { useNewTicketDialogStore, useTicketDetailDialogStore, useUserStore } from '~/store';

const CUSTOMER_PAGE_SIZE = 15;

function sectorTagStyle(hex: string): CSSProperties {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) {
    return {
      backgroundColor: 'var(--muted)',
      color: 'var(--muted-foreground)',
      borderColor: 'var(--border)',
    };
  }
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.14)`,
    color: hex,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
  };
}

export default function CustomerDashboard({ displayName }: { displayName: string }) {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const { page, pageIndex, setPageIndex, resetPage } = useUrlPagination();
  const isSectorManager = Boolean(profile?.isSectorManager);
  const sectorName = profile?.sectorName?.trim() || null;
  const sectorColor = profile?.sectorColor || '#94A3B8';
  const [numberInput, setNumberInput] = useState('');
  const [externalId, setExternalId] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const ticketNumber = useMemo(() => {
    const trimmed = numberInput.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [numberInput]);
  const hasActiveFilters = Boolean(ticketNumber || externalId.trim() || createdFrom || createdTo || includeClosed);
  const filterKey = `${ticketNumber ?? ''}|${externalId}|${createdFrom}|${createdTo}|${includeClosed}`;
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    resetPage();
  }, [filterKey, resetPage]);

  const { tickets, pages } = useListTickets({
    includeClosed,
    finishedPeriod: includeClosed ? 'last_3_months' : undefined,
    number: ticketNumber,
    externalId: externalId.trim() || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    page,
    size: CUSTOMER_PAGE_SIZE,
    scope: isSectorManager ? 'sector' : undefined,
  });
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);
  const openNewTicket = useNewTicketDialogStore((state) => state.openDialog);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              {t('dashboard.greeting', { name: displayName })}
            </h1>
            {sectorName ? (
              <Badge variant="outline" className="font-medium" style={sectorTagStyle(sectorColor)} title={t('tickets.columns.sector')}>
                {sectorName}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isSectorManager ? t('dashboard.sectorManagerSubtitle') : t('dashboard.customerSubtitle')}
          </p>
        </div>
      </div>
      <section className="space-y-3" aria-label={isSectorManager ? t('tickets.sectorTitle') : t('tickets.myTitle')}>
        <div className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-ticket-number" className="text-xs text-muted-foreground">{t('tickets.customerFilters.number')}</Label>
              <Input id="filter-ticket-number" inputMode="numeric" value={numberInput} onChange={(event) => setNumberInput(event.target.value.replace(/\D/g, ''))} placeholder={t('tickets.customerFilters.numberPlaceholder')} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-external-id" className="text-xs text-muted-foreground">{t('tickets.customerFilters.externalId')}</Label>
              <Input id="filter-external-id" value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder={t('tickets.externalIdPlaceholder')} className="h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-muted-foreground">{t('tickets.customerFilters.dateRange')}</Label>
              <DateRangePicker value={{ from: createdFrom || undefined, to: createdTo || undefined }} onChange={(range) => {
                setCreatedFrom(range.from ?? '');
                setCreatedTo(range.to ?? '');
              }} />
            </div>
          </div>
          <div className="flex items-center gap-2 pb-0.5 sm:shrink-0">
            <Switch id="filter-include-closed" checked={includeClosed} onCheckedChange={setIncludeClosed} aria-label={t('tickets.showFinished')} />
            <Label htmlFor="filter-include-closed" className="cursor-pointer text-sm font-normal text-foreground">{t('tickets.showFinished')}</Label>
          </div>
        </div>
        <TicketList
          tickets={tickets}
          showAssignee={false}
          showRequester={isSectorManager}
          showExternalId
          showSearch={false}
          onTicketClick={openTicket}
          emptyMessage={hasActiveFilters ? t('tickets.noResults') : undefined}
          emptyActionLabel={hasActiveFilters ? undefined : t('tickets.new')}
          onEmptyAction={hasActiveFilters ? undefined : openNewTicket}
          manualPagination
          pageIndex={pageIndex}
          pageCount={Math.max(pages, 1)}
          pageSize={CUSTOMER_PAGE_SIZE}
          onPageChange={setPageIndex}
        />
      </section>
    </div>
  );
}
