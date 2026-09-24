import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';

export type DateRangeValue = {
  from?: string;
  to?: string;
};

type DateRangePickerProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Inclusive maximum selectable day (e.g. today). */
  maxDate?: Date;
  size?: 'default' | 'sm';
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export default function DateRangePicker({
  value,
  onChange,
  placeholder,
  className,
  'aria-label': ariaLabel,
  open: openProp,
  onOpenChange,
  maxDate,
  size = 'default',
}: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) {
      setUncontrolledOpen(next);
    }
  };
  const maxDay = maxDate ? startOfDay(maxDate) : null;
  const fromDate = parseIsoDate(value.from);
  const toDate = parseIsoDate(value.to);
  const [visibleMonth, setVisibleMonth] = useState(
    () => fromDate ?? toDate ?? startOfDay(new Date()),
  );
  /** Local highlight while picking; kept in a ref so rapid clicks don't use stale state. */
  const [hoverRange, setHoverRange] = useState<{ from: Date | null; to: Date | null }>({
    from: fromDate,
    to: toDate,
  });
  const pickingFromRef = useRef<Date | null>(null);

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(2024, 0, index); // Sunday-start reference week
      return formatter.format(date);
    });
  }, [i18n.language]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: 'long',
        year: 'numeric',
      }).format(visibleMonth),
    [i18n.language, visibleMonth],
  );

  const days = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);

  const triggerLabel = useMemo(() => {
    const format = (date: Date) =>
      date.toLocaleDateString(i18n.language, { dateStyle: 'short' });
    if (fromDate && toDate) {
      return `${format(fromDate)} – ${format(toDate)}`;
    }
    if (fromDate) {
      return `${format(fromDate)} – …`;
    }
    return placeholder ?? t('tickets.customerFilters.dateRangePlaceholder');
  }, [fromDate, toDate, i18n.language, placeholder, t]);

  const openPicker = () => {
    pickingFromRef.current = null;
    setHoverRange({ from: fromDate, to: toDate });
    setVisibleMonth(fromDate ?? toDate ?? startOfDay(new Date()));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    pickingFromRef.current = null;
    setHoverRange({ from: fromDate, to: toDate });
    setVisibleMonth(fromDate ?? toDate ?? startOfDay(new Date()));
    // Only re-sync when the popover opens, not when the range value changes mid-pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-edge sync
  }, [open]);


  const selectDay = (day: Date) => {
    const pickingFrom = pickingFromRef.current;

    // First click (or restart after a completed range): set start only.
    if (!pickingFrom) {
      pickingFromRef.current = day;
      setHoverRange({ from: day, to: null });
      onChange({ from: toIsoDate(day), to: undefined });
      return;
    }

    // Second click: complete the range (swap if end < start).
    let rangeFrom = pickingFrom;
    let rangeTo = day;
    if (day < pickingFrom) {
      rangeFrom = day;
      rangeTo = pickingFrom;
    }

    pickingFromRef.current = null;
    setHoverRange({ from: rangeFrom, to: rangeTo });
    onChange({ from: toIsoDate(rangeFrom), to: toIsoDate(rangeTo) });
    setOpen(false);
  };

  const clearRange = () => {
    pickingFromRef.current = null;
    setHoverRange({ from: null, to: null });
    onChange({ from: undefined, to: undefined });
  };

  const rangeStart = hoverRange.from ?? fromDate;
  const rangeEnd = hoverRange.to ?? toDate;

  return (
    <div className={cn('flex w-full items-center gap-1', className)}>
      <Popover
        modal
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            openPicker();
            return;
          }
          // If the user closes after picking only the start, keep from=to so the filter still applies.
          if (pickingFromRef.current && !value.to) {
            const only = pickingFromRef.current;
            pickingFromRef.current = null;
            onChange({ from: toIsoDate(only), to: toIsoDate(only) });
          } else {
            pickingFromRef.current = null;
          }
          setOpen(false);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'min-w-0 flex-1 justify-start gap-2 px-3 font-normal',
              size === 'sm' ? 'h-8 text-xs' : 'h-9',
              !(fromDate || toDate) && 'text-muted-foreground',
            )}
            aria-label={ariaLabel ?? t('tickets.customerFilters.dateRange')}
          >
            <CalendarDays className={cn('shrink-0 opacity-70', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-3"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                  )
                }
                aria-label={t('tickets.customerFilters.prevMonth')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-medium capitalize">{monthLabel}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                  )
                }
                aria-label={t('tickets.customerFilters.nextMonth')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekdayLabels.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground"
                >
                  {label}
                </div>
              ))}
              {days.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-8 w-8" />;
                }

                const disabled = Boolean(maxDay && day > maxDay);
                const inRange = Boolean(
                  rangeStart && rangeEnd && day >= rangeStart && day <= rangeEnd,
                );
                const isStart = rangeStart ? isSameDay(day, rangeStart) : false;
                const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
                const isSelected = isStart || isEnd;

                return (
                  <button
                    key={toIsoDate(day)}
                    type="button"
                    disabled={disabled}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (!disabled) selectDay(day);
                    }}
                    className={cn(
                      'h-8 w-8 rounded-md text-sm tabular-nums transition-colors',
                      disabled
                        ? 'cursor-not-allowed text-muted-foreground/40'
                        : 'hover:bg-accent hover:text-accent-foreground',
                      inRange && !isSelected && !disabled && 'bg-primary/10 text-foreground',
                      isSelected &&
                        !disabled &&
                        'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              {t('tickets.customerFilters.dateRangeHint')}
            </p>
          </div>
        </PopoverContent>
      </Popover>
      {fromDate || toDate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 text-muted-foreground',
            size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
          )}
          onClick={clearRange}
          aria-label={t('tickets.customerFilters.clearDateRange')}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
