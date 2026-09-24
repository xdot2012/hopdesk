import { ChevronRight, GripVertical } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import type { KnowledgeBaseSortableArticleItem } from '.';

type ArticleRowProps = {
  item: KnowledgeBaseSortableArticleItem;
  sortable: boolean;
  showStatus: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isUpdating: boolean;
  onDragStart: (articleId: string) => void;
  onDragEnd: () => void;
  onDragOverItem: (articleId: string) => void;
  onDropOnItem: (draggedId: string, targetId: string) => void;
};

export default function ArticleRow({
  item,
  sortable,
  showStatus,
  isDragging,
  isDragOver,
  isUpdating,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDropOnItem,
}: ArticleRowProps) {
  const { t } = useTranslation();
  const didDragRef = useRef(false);
  const isDraft = item.status === 'draft';

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!sortable) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragOverItem(item.id);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!sortable) return;
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData('text/plain');
    if (draggedId) onDropOnItem(draggedId, item.id);
  };

  const content = (
    <>
      <div className="min-w-0">
        <p className={cn('font-semibold', isDraft && 'text-muted-foreground')}>{item.title}</p>
        {item.childrenCount != null && item.childrenCount > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t('knowledgeBase.childrenCount', { count: item.childrenCount })}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showStatus && item.status && (
          <Badge variant="secondary">
            {t(`knowledgeBase.status.${item.status}`, { defaultValue: item.status })}
          </Badge>
        )}
        {item.childrenCount != null && item.childrenCount > 0 && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </>
  );

  return (
    <div
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(isDragOver && sortable && 'rounded-lg ring-2 ring-primary/40')}
    >
      <Card
        className={cn(
          'transition hover:border-primary/40 hover:bg-accent/40',
          isDraft && 'border-muted/60 bg-muted/20 hover:border-muted hover:bg-muted/30',
          isDragging && 'opacity-50',
          isUpdating && 'pointer-events-none opacity-70',
        )}
      >
        <CardContent className="flex items-start gap-2 p-4">
          {sortable && (
            <button
              type="button"
              draggable
              aria-label={t('knowledgeBase.reorderArticles')}
              className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
              onDragStart={(event) => {
                didDragRef.current = false;
                event.dataTransfer.setData('text/plain', item.id);
                event.dataTransfer.effectAllowed = 'move';
                onDragStart(item.id);
              }}
              onDrag={(event) => {
                if (event.clientX !== 0 || event.clientY !== 0) didDragRef.current = true;
              }}
              onDragEnd={() => {
                onDragEnd();
                window.setTimeout(() => {
                  didDragRef.current = false;
                }, 0);
              }}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </button>
          )}
          {item.onClick ? (
            <button
              type="button"
              draggable={false}
              className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
              onClick={(event) => {
                if (didDragRef.current) {
                  event.preventDefault();
                  return;
                }
                item.onClick?.();
              }}
            >
              {content}
            </button>
          ) : (
            <Link
              to={item.href}
              draggable={false}
              className="flex min-w-0 flex-1 items-start justify-between gap-3"
              onClick={(event) => {
                if (didDragRef.current) event.preventDefault();
              }}
            >
              {content}
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
