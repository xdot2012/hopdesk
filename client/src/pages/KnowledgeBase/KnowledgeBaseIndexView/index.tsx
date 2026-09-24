import { useTranslation } from 'react-i18next';
import { useListKnowledgeBaseArticles } from '~/api/knowledgeBase';
import EmptyState from '~/components/EmptyState';
import { Button } from '~/components/ui/button';
import { useUserStore } from '~/store';
import { isCustomerRole } from '~/util/roles';
import ArticleSearchResult from './ArticleSearchResult';

type KnowledgeBaseIndexViewProps = {
  searchQuery?: string | null;
  onSelectArticle: (idOrSlug: string) => void;
  onClearSearch: () => void;
};

export default function KnowledgeBaseIndexView({
  searchQuery = null,
  onSelectArticle,
  onClearSearch,
}: KnowledgeBaseIndexViewProps) {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const customer = isCustomerRole(profile?.role);
  const query = searchQuery?.trim() || '';
  const searching = Boolean(query);

  const { articles } = useListKnowledgeBaseArticles(searching ? { search: query } : null);

  if (!searching) {
    return (
      <EmptyState
        title={t('knowledgeBase.selectFromTreeTitle')}
        description={
          customer ? t('knowledgeBase.customerSubtitle') : t('knowledgeBase.selectFromTreeHint')
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('knowledgeBase.title')}</h1>
        <p className="text-muted-foreground">
          {t('knowledgeBase.searchResultsSubtitle', { query })}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-fit px-0 hover:bg-transparent"
        onClick={onClearSearch}
      >
        {t('knowledgeBase.clearSearch')}
      </Button>

      <div className="space-y-2">
        {articles.length === 0 ? (
          <EmptyState
            title={t('knowledgeBase.empty')}
            description={t('knowledgeBase.emptyHint')}
          />
        ) : (
          articles.map((article) => (
            <ArticleSearchResult
              key={article.id}
              article={article}
              customer={customer}
              onSelect={onSelectArticle}
            />
          ))
        )}
      </div>
    </div>
  );
}
