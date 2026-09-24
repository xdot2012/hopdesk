import { useCallback, useEffect, useRef, useState } from 'react';
import ArticleRow from './ArticleRow';

export type KnowledgeBaseSortableArticleItem = {
  id: string;
  title: string;
  href: string;
  status?: string;
  childrenCount?: number;
  onClick?: () => void;
};

type KnowledgeBaseArticleSortableListProps = {
  items: KnowledgeBaseSortableArticleItem[];
  sortable?: boolean;
  showStatus?: boolean;
  reordering?: boolean;
  onReorder: (orderedIds: string[]) => Promise<void>;
};

function moveArticleItem<T extends { id: string }>(
  items: T[],
  draggedId: string,
  targetId: string | null,
): T[] | null {
  const fromIndex = items.findIndex((item) => item.id === draggedId);
  if (fromIndex < 0) return null;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (targetId === null) {
    next.push(moved);
    return next;
  }
  if (draggedId === targetId) return null;
  const toIndex = next.findIndex((item) => item.id === targetId);
  if (toIndex < 0) return null;
  next.splice(toIndex, 0, moved);
  return next;
}

export default function KnowledgeBaseArticleSortableList({
  items,
  sortable = false,
  showStatus = false,
  reordering = false,
  onReorder,
}: KnowledgeBaseArticleSortableListProps) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const orderedItemsRef = useRef(orderedItems);

  useEffect(() => setOrderedItems(items), [items]);
  useEffect(() => {
    orderedItemsRef.current = orderedItems;
  }, [orderedItems]);

  const persistReorder = useCallback(async (nextItems: KnowledgeBaseSortableArticleItem[]) => {
    const previousItems = orderedItemsRef.current;
    setOrderedItems(nextItems);
    try {
      await onReorder(nextItems.map((item) => item.id));
    } catch {
      setOrderedItems(previousItems);
    }
  }, [onReorder]);

  const handleDrop = useCallback((draggedId: string, targetId: string | null) => {
    setDraggingId(null);
    setDragOverId(null);
    if (!draggedId) return;
    const nextItems = moveArticleItem(orderedItemsRef.current, draggedId, targetId);
    if (nextItems) void persistReorder(nextItems);
  }, [persistReorder]);

  return (
    <div className="space-y-2">
      {orderedItems.map((item) => (
        <ArticleRow
          key={item.id}
          item={item}
          sortable={sortable}
          showStatus={showStatus}
          isDragging={draggingId === item.id}
          isDragOver={dragOverId === item.id}
          isUpdating={reordering}
          onDragStart={setDraggingId}
          onDragEnd={() => {
            setDraggingId(null);
            setDragOverId(null);
          }}
          onDragOverItem={setDragOverId}
          onDropOnItem={handleDrop}
        />
      ))}
      {sortable && draggingId && (
        <div
          aria-hidden
          onDragEnter={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragOverId(null);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragOverId(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleDrop(event.dataTransfer.getData('text/plain'), null);
          }}
          className="h-8 rounded-lg border border-dashed border-muted-foreground/30"
        />
      )}
    </div>
  );
}
