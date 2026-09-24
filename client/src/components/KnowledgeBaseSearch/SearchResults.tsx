import { BookOpen, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBaseArticleListItem } from '~/api/knowledgeBase';
import type { TicketListItem } from '~/api/ticket/types';
import { Button } from '~/components/ui/button';
import { scrollPortaledOnWheel } from '~/lib/portaledScroll';

export type SearchResultsProps = {
  loading: boolean;
  articles: KnowledgeBaseArticleListItem[];
  tickets: TicketListItem[];
  onSelectArticle: (idOrSlug: string) => void;
  onSelectTicket: (ticketId: string) => void;
  onViewAllArticles: () => void;
};

export default function SearchResults({
  loading,
  articles,
  tickets,
  onSelectArticle,
  onSelectTicket,
  onViewAllArticles,
}: SearchResultsProps) {
  const { t } = useTranslation();
  const empty = articles.length === 0 && tickets.length === 0;

  return (
    <div className="max-h-80 overflow-y-auto overscroll-contain py-1" onWheel={scrollPortaledOnWheel}>
      {loading ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : empty ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">{t('knowledgeBase.searchEmpty')}</p>
      ) : (
        <>
          {tickets.length > 0 ? (
            <div>
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('knowledgeBase.searchTickets')}
              </p>
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent"
                  onClick={() => onSelectTicket(ticket.id)}
                >
                  <Ticket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      #{ticket.number} · {ticket.subject}
                    </span>
                    {ticket.status ? (
                      <span className="block text-xs text-muted-foreground">
                        {t(`tickets.status.${ticket.status}`, { defaultValue: ticket.status })}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {articles.length > 0 ? (
            <div className={tickets.length > 0 ? 'border-t' : undefined}>
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('knowledgeBase.searchArticles')}
              </p>
              {articles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent"
                  onClick={() => onSelectArticle(article.slug)}
                >
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium">{article.title}</span>
                </button>
              ))}
              <div className="border-t px-3 py-2">
                <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2" onClick={onViewAllArticles}>
                  {t('knowledgeBase.viewAllResults')}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
