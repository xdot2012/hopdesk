import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  type KnowledgeBaseArticle,
  refreshKnowledgeBaseCaches,
  useDeleteKnowledgeBaseArticle,
  useGetKnowledgeBaseArticle,
  useUpdateKnowledgeBaseArticle,
} from '~/api/knowledgeBase';
import ButtonWithDialog from '~/components/ButtonWithDialog';
import KnowledgeBaseVisibilityLock from '~/pages/KnowledgeBase/KnowledgeBaseVisibilityLock';
import RichTextEditor from '~/components/RichTextEditor';
import RichTextViewer from '~/components/RichTextViewer';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import useKnowledgeBaseNavigation from '~/hooks/useKnowledgeBaseNavigation';
import { useAlertStore, useUserStore } from '~/store';
import { isAgentRole } from '~/util/roles';
import { getApiErrorMessage } from '~/util/functions';
import { cn } from '~/lib/utils';

const AUTOSAVE_MS = 800;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type KnowledgeBaseArticleViewProps = {
  articleRef: string;
};

export default function KnowledgeBaseArticleView({
  articleRef,
}: KnowledgeBaseArticleViewProps) {
  const { t } = useTranslation();
  const { openArticle, goHome } = useKnowledgeBaseNavigation();
  const { profile } = useUserStore();
  const agent = isAgentRole(profile?.role);
  const [displayArticle, setDisplayArticle] = useState<KnowledgeBaseArticle | null>(null);
  const { article: fetchedArticle, error, mutate } = useGetKnowledgeBaseArticle(articleRef);
  const articleMatchesRef = (item: KnowledgeBaseArticle | null | undefined) =>
    Boolean(item && (articleRef === item.slug || articleRef === item.id));
  const matchedArticle =
    (articleMatchesRef(displayArticle) ? displayArticle : null) ??
    (articleMatchesRef(fetchedArticle) ? fetchedArticle : null);
  // Keep previous page on screen while the next one loads (avoids loading flash).
  const article = matchedArticle ?? displayArticle ?? fetchedArticle ?? null;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('<p></p>');
  const [staffOnly, setStaffOnly] = useState(false);
  const [syncedRef, setSyncedRef] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const dirtyRef = useRef(false);
  const syncedArticleIdRef = useRef<string | null>(null);
  // Bound to articleRef so navigation disables edit/save before effects run.
  const contentReady =
    Boolean(matchedArticle) &&
    syncedRef === articleRef &&
    syncedArticleIdRef.current === matchedArticle?.id;
  const { trigger, isMutating } = useUpdateKnowledgeBaseArticle(
    contentReady ? (matchedArticle?.id ?? '') : '',
  );
  const { trigger: deleteArticle, isMutating: isDeleting } = useDeleteKnowledgeBaseArticle(
    contentReady ? (matchedArticle?.id ?? '') : '',
  );
  const { showErrorSnack, showSuccessSnack } = useAlertStore();

  useEffect(() => {
    setDisplayArticle(null);
    dirtyRef.current = false;
    setSaveState('idle');
  }, [articleRef]);

  useEffect(() => {
    if (!fetchedArticle?.slug) return;
    if (articleRef === fetchedArticle.slug) return;
    if (UUID_RE.test(articleRef) && articleRef === fetchedArticle.id) {
      openArticle(fetchedArticle.slug, { replace: true });
    }
  }, [articleRef, fetchedArticle, openArticle]);

  useEffect(() => {
    if (!matchedArticle) return;
    if (
      syncedRef === articleRef &&
      syncedArticleIdRef.current === matchedArticle.id
    ) {
      return;
    }

    setTitle(matchedArticle.title);
    setBody(matchedArticle.body || '<p></p>');
    setStaffOnly(matchedArticle.visibility === 'staff');
    syncedArticleIdRef.current = matchedArticle.id;
    dirtyRef.current = false;
    setSyncedRef(articleRef);
    setSaveState('idle');
  }, [articleRef, matchedArticle, syncedRef]);

  const hasChanges = useMemo(() => {
    if (!matchedArticle || !contentReady) return false;
    return (
      title !== matchedArticle.title ||
      body !== (matchedArticle.body || '<p></p>') ||
      staffOnly !== (matchedArticle.visibility === 'staff')
    );
  }, [body, contentReady, matchedArticle, staffOnly, title]);

  const persistArticle = useCallback(
    async (overrides?: { status?: string }) => {
      if (!matchedArticle || !contentReady || !title.trim()) return;

      const titleChanged = title !== matchedArticle.title;
      const visibilityChanged = staffOnly !== (matchedArticle.visibility === 'staff');
      setSaveState('saving');
      try {
        const result = await trigger({
          title,
          body,
          visibility: staffOnly ? 'staff' : 'public',
          ...overrides,
        });
        if (result?.data) {
          setDisplayArticle(result.data);
          setTitle(result.data.title);
          setStaffOnly(result.data.visibility === 'staff');
          syncedArticleIdRef.current = result.data.id;
          dirtyRef.current = false;
          await mutate({ data: result.data, status: result.status }, { revalidate: false });
          if (result.data.slug !== articleRef) {
            openArticle(result.data.slug, { replace: true });
          }
        }
        if (titleChanged || visibilityChanged) {
          await refreshKnowledgeBaseCaches();
        }
        setSaveState('saved');
      } catch (error: unknown) {
        setSaveState('error');
        showErrorSnack(getApiErrorMessage(error, t('knowledgeBase.updateError')));
        throw error;
      }
    },
    [
      articleRef,
      body,
      contentReady,
      matchedArticle,
      mutate,
      openArticle,
      showErrorSnack,
      staffOnly,
      t,
      title,
      trigger,
    ],
  );

  useEffect(() => {
    if (!agent || !contentReady || !matchedArticle || !dirtyRef.current || !hasChanges) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistArticle();
    }, AUTOSAVE_MS);

    return () => window.clearTimeout(timer);
  }, [agent, contentReady, hasChanges, matchedArticle, persistArticle, title, body, staffOnly]);

  const handleBodyChange = useCallback((html: string) => {
    dirtyRef.current = true;
    setBody(html);
  }, []);

  const handleTitleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    dirtyRef.current = true;
    setTitle(event.target.value);
  }, []);

  const publish = async () => {
    try {
      await persistArticle({ status: 'published' });
      showSuccessSnack(t('knowledgeBase.published'));
    } catch {
      // persistArticle already shows error
    }
  };

  const handleVisibilityChange = () => {
    dirtyRef.current = true;
    setStaffOnly((current) => !current);
  };

  const handleDelete = async () => {
    if (!matchedArticle || !contentReady) return;
    try {
      await deleteArticle({});
      await refreshKnowledgeBaseCaches();
      showSuccessSnack(t('knowledgeBase.deleted'));
      goHome();
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('knowledgeBase.deleteError')));
    }
  };

  if (error && !contentReady) {
    return <p className="text-destructive">{t('knowledgeBase.loadError')}</p>;
  }

  if (!article) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }

  const saveStatusLabel =
    saveState === 'saving'
      ? t('knowledgeBase.saving')
      : saveState === 'saved'
        ? t('knowledgeBase.saved')
        : saveState === 'error'
          ? t('knowledgeBase.saveError')
          : null;

  const childrenCount = article.childrenCount ?? 0;
  const deleteDialogText =
    childrenCount > 0
      ? t('knowledgeBase.deleteConfirmWithChildren', { count: childrenCount })
      : t('knowledgeBase.deleteConfirm');

  return (
    <div
      className={cn(
        'mx-auto max-w-3xl space-y-4 pb-8 transition-opacity duration-150',
        !contentReady && 'pointer-events-none opacity-60',
      )}
    >
      <div className={cn(agent && 'space-y-3 border-b pb-3')}>
        <div className="flex items-start gap-2">
          {agent && (
            <KnowledgeBaseVisibilityLock
              staffOnly={staffOnly}
              onToggle={handleVisibilityChange}
            />
          )}
          {agent ? (
            <textarea
              value={title}
              onChange={handleTitleChange}
              placeholder={t('knowledgeBase.titlePlaceholder')}
              rows={1}
              className={cn(
                'min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-3xl font-bold tracking-tight',
                'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0',
              )}
            />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
          )}
          {agent && (
            <ButtonWithDialog
              size="icon"
              variant="outline"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              dialogTitle={t('knowledgeBase.deleteTitle')}
              dialogText={deleteDialogText}
              disabled={isMutating || isDeleting || !contentReady}
              onConfirm={() => {
                void handleDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">{t('knowledgeBase.delete')}</span>
            </ButtonWithDialog>
          )}
        </div>

        {agent && article.status !== 'published' && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="secondary">
              {t(`knowledgeBase.status.${article.status}`, { defaultValue: article.status })}
            </Badge>
            <div className="ml-auto">
              <Button size="sm" onClick={publish} disabled={isMutating || isDeleting || !title.trim()}>
                {t('knowledgeBase.publish')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {agent ? (
        <RichTextEditor
          articleId={article.id}
          value={body}
          onChange={handleBodyChange}
          borderless
        />
      ) : (
        <RichTextViewer html={article.body} />
      )}

      {agent && saveStatusLabel && (
        <footer className="flex items-center justify-end border-t pt-4 text-sm">
          <span
            className={cn(
              'text-muted-foreground',
              saveState === 'error' && 'text-destructive',
            )}
          >
            {saveStatusLabel}
          </span>
        </footer>
      )}
    </div>
  );
}
