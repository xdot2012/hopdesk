import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import type { SlaGaugeItem } from './chartModel';
import EmptyChartMessage from './EmptyChartMessage';
import SlaProgressBar from './SlaProgressBar';

type Props = {
  title: string;
  items: SlaGaugeItem[];
  grouped: boolean;
  emptyMessage: string;
  firstResponseLabel: string;
  resolutionLabel: string;
  withinLabel: string;
  outsideLabel: string;
};

/** Collapsed body height — roughly 5–6 group rows before scrolling. */
const COLLAPSED_MAX_REM = 12;
const COLLAPSED_BODY_CLASS = `max-h-48 overflow-y-auto`;

function rateOf(fulfilled: number, failed: number): number | null {
  const total = fulfilled + failed;
  if (total === 0) return null;
  return Math.round((fulfilled / total) * 1000) / 10;
}

function formatRate(rate: number | null): string {
  return rate == null ? '—' : `${rate}%`;
}

export default function SlaCompliancePanel({
  title,
  items,
  grouped,
  emptyMessage,
  firstResponseLabel,
  resolutionLabel,
  withinLabel,
  outsideLabel,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const hasData = items.some(
    (item) =>
      item.firstResponse.fulfilled +
        item.firstResponse.failed +
        item.resolution.fulfilled +
        item.resolution.failed >
      0,
  );

  useLayoutEffect(() => {
    if (!grouped || !hasData) {
      setOverflows(false);
      setExpanded(false);
      return;
    }
    const el = bodyRef.current;
    if (!el) return;
    const collapsedMaxPx =
      COLLAPSED_MAX_REM *
      parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
    const doesOverflow = el.scrollHeight > collapsedMaxPx + 1;
    setOverflows(doesOverflow);
    if (!doesOverflow) setExpanded(false);
  }, [items, grouped, hasData]);

  const showToggle = overflows || expanded;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 pb-1.5">
        <CardTitle className="text-sm md:text-base">{title}</CardTitle>
        {showToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2 text-xs"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                {t('dashboard.sla.collapsePanel')}
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                {t('dashboard.sla.expandPanel')}
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {!hasData ? (
          <div className="flex min-h-[6rem] items-center justify-center">
            <EmptyChartMessage message={emptyMessage} />
          </div>
        ) : !grouped ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <SlaProgressBar
              label={firstResponseLabel}
              fulfilled={items[0]?.firstResponse.fulfilled ?? 0}
              failed={items[0]?.firstResponse.failed ?? 0}
              withinLabel={withinLabel}
              outsideLabel={outsideLabel}
            />
            <SlaProgressBar
              label={resolutionLabel}
              fulfilled={items[0]?.resolution.fulfilled ?? 0}
              failed={items[0]?.resolution.failed ?? 0}
              withinLabel={withinLabel}
              outsideLabel={outsideLabel}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[minmax(6rem,1.2fr)_1fr_1fr] gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
              <span />
              <span className="text-right sm:text-left">{firstResponseLabel}</span>
              <span className="text-right sm:text-left">{resolutionLabel}</span>
            </div>
            <div
              ref={bodyRef}
              className={cn(
                'space-y-3 pr-1',
                !expanded && COLLAPSED_BODY_CLASS,
              )}
            >
              {items.map((item) => {
                const frRate = rateOf(
                  item.firstResponse.fulfilled,
                  item.firstResponse.failed,
                );
                const resRate = rateOf(
                  item.resolution.fulfilled,
                  item.resolution.failed,
                );
                return (
                  <div
                    key={item.key}
                    className="grid grid-cols-[minmax(6rem,1.2fr)_1fr_1fr] items-center gap-x-3 gap-y-1"
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.label ?? item.key}
                    </p>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${frRate ?? 0}%`,
                            backgroundColor:
                              item.color ?? 'var(--chart-sla-ok)',
                          }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                        {formatRate(frRate)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${resRate ?? 0}%`,
                            backgroundColor:
                              item.color ?? 'var(--chart-sla-ok)',
                          }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                        {formatRate(resRate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
