import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type KnowledgeBaseArticleSuggestion,
  useSuggestKnowledgeBaseArticles,
} from '~/api/knowledgeBase';
import useKnowledgeBaseNavigation from '~/hooks/useKnowledgeBaseNavigation';
import { stripHtmlToText } from '~/lib/richText';
import { cn } from '~/lib/utils';

const SUGGEST_DEBOUNCE_MS = 450;
const MIN_QUERY_CHARS = 8;
const SUGGEST_LIMIT = 5;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

type TicketKnowledgeSuggestionsProps = {
  ticketId?: string;
  subject?: string;
  description?: string;
  className?: string;
};

export default function TicketKnowledgeSuggestions({
  ticketId,
  subject = '',
  description = '',
  className,
}: TicketKnowledgeSuggestionsProps) {
  const { t } = useTranslation();
  const { openArticle } = useKnowledgeBaseNavigation();
  const { trigger } = useSuggestKnowledgeBaseArticles();
  const [suggestions, setSuggestions] = useState<KnowledgeBaseArticleSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const textQuery = ticketId
    ? ''
    : `${subject.trim()}\n${stripHtmlToText(description)}`.trim();
  const debouncedText = useDebouncedValue(textQuery, SUGGEST_DEBOUNCE_MS);
  const queryKey = ticketId
    ? `ticket:${ticketId}`
    : debouncedText.length >= MIN_QUERY_CHARS
      ? `text:${debouncedText}`
      : '';

  useEffect(() => {
    if (!queryKey) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      try {
        const result = ticketId
          ? await trigger({ ticketId, limit: SUGGEST_LIMIT })
          : await trigger({ text: debouncedText, limit: SUGGEST_LIMIT });
        if (!cancelled) {
          setSuggestions(result?.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedText, queryKey, ticketId, trigger]);

  if (!queryKey && !loading) {
    return null;
  }

  if (!loading && suggestions.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 px-3 py-3',
        className,
      )}
      aria-label={t('knowledgeBase.suggestionsTitle')}
    >
      <div className="mb-2 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {t('knowledgeBase.suggestionsTitle')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('knowledgeBase.suggestionsHint')}
          </p>
        </div>
      </div>

      {loading && suggestions.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('knowledgeBase.suggestionsLoading')}</p>
      ) : (
        <ul className="space-y-1">
          {suggestions.map((article) => (
            <li key={article.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-background/80"
                onClick={() => openArticle(article.slug)}
              >
                <BookOpen
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 font-medium text-foreground">
                  {article.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
