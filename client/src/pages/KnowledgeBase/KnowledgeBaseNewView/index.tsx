import { FormEvent, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateKnowledgeBaseArticle, refreshKnowledgeBaseCaches } from '~/api/knowledgeBase';
import KnowledgeBaseSaveButton from '~/pages/KnowledgeBase/KnowledgeBaseSaveButton';
import KnowledgeBaseVisibilityLock from '~/pages/KnowledgeBase/KnowledgeBaseVisibilityLock';
import RichTextEditor from '~/components/RichTextEditor';
import { Button } from '~/components/ui/button';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import { cn } from '~/lib/utils';

type KnowledgeBaseNewViewProps = {
  parentId?: string | null;
  onCancel: () => void;
  onCreated: (slug: string) => void;
};

export default function KnowledgeBaseNewView({
  parentId = null,
  onCancel,
  onCreated,
}: KnowledgeBaseNewViewProps) {
  const { t } = useTranslation();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { trigger, isMutating } = useCreateKnowledgeBaseArticle();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('<p></p>');
  const [staffOnly, setStaffOnly] = useState(false);

  const handleSave = async (status: 'published' | 'draft') => {
    if (!title.trim()) {
      return;
    }

    try {
      const result = await trigger({
        title,
        body,
        status,
        parentId,
        visibility: staffOnly ? 'staff' : 'public',
      });
      await refreshKnowledgeBaseCaches();
      showSuccessSnack(
        status === 'published' ? t('knowledgeBase.published') : t('knowledgeBase.draftSaved'),
      );
      onCreated(result.data.slug);
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('knowledgeBase.createError')));
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handleSave('published');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit px-0 hover:bg-transparent"
        onClick={onCancel}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('knowledgeBase.backToList')}
      </Button>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="flex items-start gap-2">
          <KnowledgeBaseVisibilityLock
            staffOnly={staffOnly}
            onToggle={() => setStaffOnly((current) => !current)}
          />
          <textarea
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('knowledgeBase.titlePlaceholder')}
            rows={1}
            required
            className={cn(
              'min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-3xl font-bold tracking-tight',
              'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0',
            )}
          />
        </div>

        <RichTextEditor value={body} onChange={setBody} borderless />

        <KnowledgeBaseSaveButton
          disabled={isMutating || !title.trim()}
          onSaveDraft={() => void handleSave('draft')}
        />
      </form>
    </div>
  );
}
