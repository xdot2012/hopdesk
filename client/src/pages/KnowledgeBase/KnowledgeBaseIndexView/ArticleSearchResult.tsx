import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBaseArticleListItem } from '~/api/knowledgeBase';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';

type ArticleSearchResultProps = {
  article: KnowledgeBaseArticleListItem;
  customer: boolean;
  onSelect: (idOrSlug: string) => void;
};

export default function ArticleSearchResult({
  article,
  customer,
  onSelect,
}: ArticleSearchResultProps) {
  const { t } = useTranslation();
  const isDraft = article.status === 'draft';

  return (
    <button type="button" className="block w-full text-left" onClick={() => onSelect(article.slug)}>
      <Card
        className={cn(
          'transition hover:border-primary/40 hover:bg-accent/40',
          isDraft && 'border-muted/60 bg-muted/20 hover:border-muted hover:bg-muted/30',
        )}
      >
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className={cn('font-semibold', isDraft && 'text-muted-foreground')}>
              {article.title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!customer && (
              <Badge variant="secondary">
                {t(`knowledgeBase.status.${article.status}`, {
                  defaultValue: article.status,
                })}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
