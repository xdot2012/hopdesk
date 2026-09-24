import { useCallback, useEffect, useId, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBaseArticleListItem } from '~/api/knowledgeBase';
import { KNOWLEDGE_BASE_ARTICLES_PATH } from '~/api';
import { buildListTicketsUrl, type TicketListPage } from '~/api/ticket/listTickets';
import type { TicketListItem } from '~/api/ticket/types';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '~/components/ui/popover';
import useIsMobile from '~/hooks/useIsMobile';
import useKnowledgeBaseNavigation from '~/hooks/useKnowledgeBaseNavigation';
import { cn } from '~/lib/utils';
import http from '~/services/http';
import { useTicketDetailDialogStore, useUserStore } from '~/store';
import { isCustomerRole } from '~/util/roles';
import SearchResults, { type SearchResultsProps } from './SearchResults';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 5;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

type KnowledgeBaseSearchProps = {
  className?: string;
};

export default function KnowledgeBaseSearch({ className }: KnowledgeBaseSearchProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { openArticle, openKnowledgeBase } = useKnowledgeBaseNavigation();
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);
  const profile = useUserStore((state) => state.profile);
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [articles, setArticles] = useState<KnowledgeBaseArticleListItem[]>([]);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const ticketScope =
    isCustomerRole(profile?.role) && profile?.isSectorManager ? 'sector' : undefined;

  const fetchResults = useCallback(
    async (search: string) => {
      const trimmed = search.trim();
      if (!trimmed) {
        setArticles([]);
        setTickets([]);
        return;
      }

      setLoading(true);
      try {
        const articleParams = new URLSearchParams({
          search: trimmed,
          limit: String(SEARCH_LIMIT),
        });
        const ticketsUrl = buildListTicketsUrl({
          search: trimmed,
          includeClosed: true,
          finishedPeriod: 'last_3_months',
          scope: ticketScope,
          page: 1,
          size: SEARCH_LIMIT,
        });

        const [articlesResponse, ticketsResponse] = await Promise.all([
          http.get<KnowledgeBaseArticleListItem[]>(
            `${KNOWLEDGE_BASE_ARTICLES_PATH}?${articleParams.toString()}`,
          ),
          http.get<TicketListPage>(ticketsUrl),
        ]);

        setArticles(Array.isArray(articlesResponse.data) ? articlesResponse.data : []);
        setTickets(
          Array.isArray(ticketsResponse.data?.items) ? ticketsResponse.data.items : [],
        );
      } catch {
        setArticles([]);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    },
    [ticketScope],
  );

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setArticles([]);
      setTickets([]);
      return;
    }
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  const showResults = debouncedQuery.trim().length > 0;

  const clearSearch = () => {
    setOpen(false);
    setDialogOpen(false);
    setQuery('');
    setArticles([]);
    setTickets([]);
  };

  const goToArticle = (slug: string) => {
    clearSearch();
    openArticle(slug);
  };

  const goToTicket = (ticketId: string) => {
    clearSearch();
    openTicket(ticketId);
  };

  const goToAllArticles = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    clearSearch();
    openKnowledgeBase({ searchQuery: trimmed });
  };

  const resultsProps: SearchResultsProps = {
    loading,
    articles,
    tickets,
    onSelectArticle: goToArticle,
    onSelectTicket: goToTicket,
    onViewAllArticles: goToAllArticles,
  };

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('knowledgeBase.navbarSearch')}
          onClick={() => setDialogOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="gap-4">
            <DialogHeader>
              <DialogTitle>{t('knowledgeBase.navbarSearch')}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={inputId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('knowledgeBase.navbarSearch')}
                className="pl-9"
                aria-label={t('knowledgeBase.navbarSearch')}
                autoComplete="off"
              />
            </div>
            {showResults ? <SearchResults {...resultsProps} /> : null}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={open && showResults} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn('relative w-full min-w-0', className)}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={inputId}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t('knowledgeBase.navbarSearch')}
            className="pl-9"
            aria-label={t('knowledgeBase.navbarSearch')}
            autoComplete="off"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="end"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SearchResults {...resultsProps} />
      </PopoverContent>
    </Popover>
  );
}
