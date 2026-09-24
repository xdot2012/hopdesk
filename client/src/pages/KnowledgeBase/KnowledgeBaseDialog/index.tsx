import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  type KnowledgeBaseArticleTreeNode,
  refreshKnowledgeBaseCaches,
  reorderKnowledgeBaseArticles,
  useListKnowledgeBaseArticleTree,
} from '~/api/knowledgeBase';
import KnowledgeBaseArticleView from '~/pages/KnowledgeBase/KnowledgeBaseArticleView';
import KnowledgeBaseIndexView from '~/pages/KnowledgeBase/KnowledgeBaseIndexView';
import KnowledgeBaseNewView from '~/pages/KnowledgeBase/KnowledgeBaseNewView';
import KnowledgeBaseTree from '~/pages/KnowledgeBase/KnowledgeBaseTree';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog';
import useKnowledgeBaseNavigation from '~/hooks/useKnowledgeBaseNavigation';
import { useAlertStore, useUserStore } from '~/store';
import { isAgentRole } from '~/util/roles';
import { getApiErrorMessage } from '~/util/functions';

function getFirstArticle(nodes: KnowledgeBaseArticleTreeNode[]): KnowledgeBaseArticleTreeNode | null {
  if (nodes.length === 0) {
    return null;
  }

  const sorted = [...nodes].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
  );

  return sorted[0] ?? null;
}

export default function KnowledgeBaseDialog() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const agent = isAgentRole(profile?.role);
  const {
    isOpen,
    mode,
    articleRef,
    searchQuery,
    parentId,
    openArticle,
    openNewArticle,
    goHome,
    closeKnowledgeBase,
  } = useKnowledgeBaseNavigation();
  const { tree } = useListKnowledgeBaseArticleTree(isOpen);
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const [reordering, setReordering] = useState(false);

  const handleReorder = useCallback(
    async (parentId: string | null, orderedIds: string[]) => {
      setReordering(true);
      try {
        await reorderKnowledgeBaseArticles({
          articleIds: orderedIds,
          parentId: parentId ?? undefined,
        });
        await refreshKnowledgeBaseCaches();
        showSuccessSnack(t('knowledgeBase.reorderSuccess'));
      } catch (error: unknown) {
        showErrorSnack(getApiErrorMessage(error, t('knowledgeBase.reorderError')));
        throw error;
      } finally {
        setReordering(false);
      }
    },
    [showErrorSnack, showSuccessSnack, t],
  );

  useEffect(() => {
    if (!isOpen || mode !== 'browse' || articleRef || searchQuery) {
      return;
    }

    const firstArticle = getFirstArticle(tree);
    if (firstArticle) {
      openArticle(firstArticle.slug);
    }
  }, [articleRef, isOpen, mode, openArticle, searchQuery, tree]);

  const treeActiveRef = mode === 'browse' ? articleRef : parentId;

  const renderContent = () => {
    if (mode === 'new') {
      return (
        <KnowledgeBaseNewView
          parentId={parentId}
          onCancel={goHome}
          onCreated={(slug) => openArticle(slug)}
        />
      );
    }

    if (articleRef) {
      return (
        <KnowledgeBaseArticleView articleRef={articleRef} />
      );
    }

    return (
      <KnowledgeBaseIndexView
        searchQuery={searchQuery}
        onSelectArticle={openArticle}
        onClearSearch={goHome}
      />
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeKnowledgeBase();
      }}
    >
      <DialogContent className="flex h-[min(96vh,100dvh)] w-[min(98vw,92rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogTitle className="sr-only">{t('knowledgeBase.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('knowledgeBase.selectFromTreeHint')}</DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="shrink-0 border-b bg-muted/30 p-3 lg:w-64 lg:border-b-0 lg:border-r xl:w-72">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t('knowledgeBase.treeTitle')}</p>
              {agent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  onClick={() => openNewArticle()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('knowledgeBase.newPage')}
                </Button>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto lg:max-h-[calc(min(96vh,100dvh)-5rem)]">
              <KnowledgeBaseTree
                nodes={tree}
                activeArticleRef={treeActiveRef}
                onSelectArticle={openArticle}
                onNewChildArticle={agent ? openNewArticle : undefined}
                sortable={agent}
                reordering={reordering}
                onReorder={agent ? handleReorder : undefined}
              />
            </div>
          </aside>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{renderContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
