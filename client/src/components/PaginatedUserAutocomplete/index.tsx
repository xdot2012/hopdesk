import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  TICKET_FILTER_USER_PAGE_SIZE,
  type TicketFilterUserOption,
  type TicketFilterUserPage,
  ticketFilterUserLabel,
} from '~/api/ticket/searchFilterUsers';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '~/components/ui/popover';
import { scrollPortaledOnWheel } from '~/lib/portaledScroll';
import { cn } from '~/lib/utils';
import http from '~/services/http';

const SEARCH_DEBOUNCE_MS = 300;

type StaticOption = {
  value: string;
  label: string;
};

type PaginatedUserAutocompleteProps = {
  value: string;
  onValueChange: (value: string, option?: StaticOption) => void;
  buildUrl: (params: { search: string; page: number; size: number }) => string;
  placeholder?: string;
  emptyOptionLabel?: string;
  staticOptions?: StaticOption[];
  className?: string;
  size?: 'default' | 'sm';
  'aria-label'?: string;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default function PaginatedUserAutocomplete({
  value,
  onValueChange,
  buildUrl,
  placeholder,
  emptyOptionLabel,
  staticOptions = [],
  className,
  size = 'default',
  'aria-label': ariaLabel,
}: PaginatedUserAutocompleteProps) {
  const { t } = useTranslation();
  const listboxId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [items, setItems] = useState<TicketFilterUserOption[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const compact = size === 'sm';

  const staticOptionMap = useRef(new Map<string, string>());
  staticOptionMap.current = new Map(staticOptions.map((option) => [option.value, option.label]));

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }

    const staticLabel = staticOptionMap.current.get(value);
    if (staticLabel) {
      setSelectedLabel(staticLabel);
    }
  }, [value, staticOptions]);

  const fetchPage = useCallback(
    async (nextPage: number, search: string, append: boolean) => {
      const isFirstPage = nextPage === 1;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      try {
        const url = buildUrl({
          search,
          page: nextPage,
          size: TICKET_FILTER_USER_PAGE_SIZE,
        });
        const { data } = await http.get<TicketFilterUserPage>(url);
        setItems((current) => (append ? [...current, ...data.items] : data.items));
        setPage(data.page);
        setPages(data.pages);
      } catch {
        if (!append) setItems([]);
      } finally {
        if (isFirstPage) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [buildUrl],
  );

  useEffect(() => {
    if (!open) return;
    void fetchPage(1, debouncedQuery.trim(), false);
  }, [open, debouncedQuery, fetchPage]);

  const hasMore = page < pages;

  const loadMore = useCallback(() => {
    if (!open || loading || loadingMore || !hasMore) return;
    void fetchPage(page + 1, debouncedQuery.trim(), true);
  }, [open, loading, loadingMore, hasMore, fetchPage, page, debouncedQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = listRef.current;
    if (!open || !sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root, rootMargin: '40px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, loadMore, items.length]);

  const displayValue = open ? query : selectedLabel;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    setQuery('');
  };

  const handleSelect = (nextValue: string, label: string) => {
    setSelectedLabel(nextValue ? label : '');
    setQuery('');
    onValueChange(nextValue, nextValue ? { value: nextValue, label } : undefined);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedLabel('');
    setQuery('');
    onValueChange('');
    inputRef.current?.focus();
  };

  const isInsideAnchor = (target: EventTarget | null) => {
    return Boolean(target instanceof Node && anchorRef.current?.contains(target));
  };

  const showEmptyState =
    !loading && items.length === 0 && staticOptions.length === 0 && !emptyOptionLabel;

  return (
    <Popover modal={false} open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className={cn('relative w-full', className)}>
          <Input
            ref={inputRef}
            type="search"
            value={displayValue}
            name={`hopdesk-user-filter-${listboxId}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            onChange={(event) => {
              setQuery(event.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              if (!open) setOpen(true);
            }}
            placeholder={open ? t('tickets.boardFilters.searchUsers') : placeholder}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            role="combobox"
            className={cn('pr-14', compact ? 'h-8 text-xs' : 'h-9')}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1.5">
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="pointer-events-auto h-6 w-6 shrink-0"
                onClick={handleClear}
                aria-label={t('tickets.boardFilters.clearSelection')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <ChevronDown
              className={cn('shrink-0 text-muted-foreground', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
              aria-hidden
            />
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          if (isInsideAnchor(event.target)) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          if (isInsideAnchor(event.target)) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isInsideAnchor(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="max-h-60 overflow-y-auto overscroll-contain p-1"
          onWheel={scrollPortaledOnWheel}
        >
          {emptyOptionLabel ? (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={cn(
                'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                !value && 'bg-accent',
                compact && 'text-xs',
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect('', emptyOptionLabel)}
            >
              {emptyOptionLabel}
            </button>
          ) : null}
          {staticOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={cn(
                'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                value === option.value && 'bg-accent',
                compact && 'text-xs',
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(option.value, option.label)}
            >
              {option.label}
            </button>
          ))}
          {items.map((item) => {
            const label = ticketFilterUserLabel(item);
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={value === item.id}
                className={cn(
                  'flex w-full flex-col rounded-sm px-2 py-1.5 text-left hover:bg-accent',
                  value === item.id && 'bg-accent',
                  compact && 'text-xs',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item.id, label)}
              >
                <span className="truncate font-medium">{label}</span>
                {item.email && item.email !== label ? (
                  <span className="truncate text-muted-foreground">{item.email}</span>
                ) : null}
              </button>
            );
          })}
          {loading || loadingMore ? (
            <p className={cn('px-2 py-2 text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
              {t('tickets.boardFilters.loadingUsers')}
            </p>
          ) : null}
          {showEmptyState ? (
            <p className={cn('px-2 py-2 text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
              {t('tickets.boardFilters.noUsersFound')}
            </p>
          ) : null}
          <div ref={sentinelRef} className="h-1" aria-hidden />
        </div>
      </PopoverContent>
    </Popover>
  );
}
