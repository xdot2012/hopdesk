import { ChevronDown, ChevronRight, FileText, Folder, GripVertical, Lock, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { KnowledgeBaseArticleTreeNode } from '~/api/knowledgeBase';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { knowledgeBaseArticle } from '~/router/paths';
import TreeSiblingList from './TreeSiblingList';

type TreeNodeProps = {
  node: KnowledgeBaseArticleTreeNode;
  depth: number;
  activeArticleRef?: string | null;
  onSelectArticle?: (idOrSlug: string) => void;
  onNewChildArticle?: (parentId: string) => void;
  sortable: boolean;
  reordering: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (articleId: string) => void;
  onDragEnd: () => void;
  onDragOverItem: (articleId: string) => void;
  onDropOnItem: (draggedId: string, targetId: string) => void;
  onReorder?: (parentId: string | null, orderedIds: string[]) => Promise<void>;
};

export default function TreeNode({
  node, depth, activeArticleRef, onSelectArticle, onNewChildArticle, sortable,
  reordering, isDragging, isDragOver, onDragStart, onDragEnd, onDragOverItem,
  onDropOnItem, onReorder,
}: TreeNodeProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const didDragRef = useRef(false);
  const hasChildren = node.children.length > 0;
  const isActive = Boolean(activeArticleRef && (activeArticleRef === node.slug || activeArticleRef === node.id));
  const isDraft = node.status === 'draft';
  const isStaffOnly = node.visibility === 'staff';
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!sortable) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragOverItem(node.id);
  };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!sortable) return;
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData('text/plain');
    if (draggedId) onDropOnItem(draggedId, node.id);
  };
  const label = (
    <>
      {hasChildren ? (
        <Folder className={cn('h-4 w-4 shrink-0', isDraft ? 'text-muted-foreground/60' : 'text-muted-foreground')} />
      ) : (
        <FileText className={cn('h-4 w-4 shrink-0', isDraft ? 'text-muted-foreground/60' : 'text-muted-foreground')} />
      )}
      <span className={cn('min-w-0 flex-1 truncate', isDraft && 'text-muted-foreground')}>{node.title}</span>
      {isStaffOnly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0" aria-label={t('knowledgeBase.visibility.staff')}>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('knowledgeBase.visibility.staff')}</TooltipContent>
        </Tooltip>
      )}
    </>
  );

  return (
    <div>
      <div
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'group flex items-center gap-1 rounded-md pr-1 text-sm',
          isActive && 'bg-accent text-accent-foreground',
          isDragOver && sortable && 'ring-2 ring-primary/40',
          isDragging && 'opacity-50',
          reordering && 'pointer-events-none opacity-70',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {sortable && (
          <button
            type="button"
            draggable
            aria-label={t('knowledgeBase.reorderArticles')}
            className="inline-flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
            onDragStart={(event) => {
              didDragRef.current = false;
              event.dataTransfer.setData('text/plain', node.id);
              event.dataTransfer.effectAllowed = 'move';
              onDragStart(node.id);
            }}
            onDrag={(event) => {
              if (event.clientX !== 0 || event.clientY !== 0) didDragRef.current = true;
            }}
            onDragEnd={() => {
              onDragEnd();
              window.setTimeout(() => { didDragRef.current = false; }, 0);
            }}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        {hasChildren ? (
          <button type="button" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="inline-block h-7 w-7 shrink-0" aria-hidden />}
        {onSelectArticle ? (
          <button
            type="button"
            draggable={false}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left hover:underline"
            onClick={(event) => {
              if (didDragRef.current) {
                event.preventDefault();
                return;
              }
              onSelectArticle(node.slug);
            }}
          >{label}</button>
        ) : (
          <Link
            to={knowledgeBaseArticle(node.slug)}
            draggable={false}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 hover:underline"
            onClick={(event) => { if (didDragRef.current) event.preventDefault(); }}
          >{label}</Link>
        )}
        {onNewChildArticle && (
          <button type="button" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100" onClick={() => onNewChildArticle(node.id)} aria-label={t('knowledgeBase.newPage')}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <TreeSiblingList
          siblings={node.children}
          depth={depth + 1}
          parentId={node.id}
          activeArticleRef={activeArticleRef}
          onSelectArticle={onSelectArticle}
          onNewChildArticle={onNewChildArticle}
          sortable={sortable}
          reordering={reordering}
          onReorder={onReorder}
        />
      )}
    </div>
  );
}
