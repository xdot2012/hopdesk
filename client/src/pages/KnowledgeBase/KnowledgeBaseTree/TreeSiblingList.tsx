import { useCallback, useEffect, useRef, useState } from 'react';
import type { KnowledgeBaseArticleTreeNode } from '~/api/knowledgeBase';
import TreeNode from './TreeNode';

type TreeSiblingListProps = {
  siblings: KnowledgeBaseArticleTreeNode[];
  depth: number;
  parentId: string | null;
  activeArticleRef?: string | null;
  onSelectArticle?: (idOrSlug: string) => void;
  onNewChildArticle?: (parentId: string) => void;
  sortable: boolean;
  reordering: boolean;
  onReorder?: (parentId: string | null, orderedIds: string[]) => Promise<void>;
};

function sortNodes(nodes: KnowledgeBaseArticleTreeNode[]) {
  return [...nodes].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
  );
}

function moveListItemById<T extends { id: string }>(
  items: T[], draggedId: string, targetId: string | null,
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

export default function TreeSiblingList({
  siblings, depth, parentId, activeArticleRef, onSelectArticle, onNewChildArticle,
  sortable, reordering, onReorder,
}: TreeSiblingListProps) {
  const [orderedSiblings, setOrderedSiblings] = useState(() => sortNodes(siblings));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const orderedSiblingsRef = useRef(orderedSiblings);
  useEffect(() => setOrderedSiblings(sortNodes(siblings)), [siblings]);
  useEffect(() => {
    orderedSiblingsRef.current = orderedSiblings;
  }, [orderedSiblings]);
  const persistReorder = useCallback(async (nextSiblings: KnowledgeBaseArticleTreeNode[]) => {
    if (!onReorder) return;
    const previousSiblings = orderedSiblingsRef.current;
    setOrderedSiblings(nextSiblings);
    try {
      await onReorder(parentId, nextSiblings.map((item) => item.id));
    } catch {
      setOrderedSiblings(previousSiblings);
    }
  }, [onReorder, parentId]);
  const handleDrop = useCallback((draggedId: string, targetId: string | null) => {
    setDraggingId(null);
    setDragOverId(null);
    if (!draggedId || !sortable) return;
    const nextSiblings = moveListItemById(orderedSiblingsRef.current, draggedId, targetId);
    if (nextSiblings) void persistReorder(nextSiblings);
  }, [persistReorder, sortable]);

  return (
    <>
      {orderedSiblings.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={depth}
          activeArticleRef={activeArticleRef}
          onSelectArticle={onSelectArticle}
          onNewChildArticle={onNewChildArticle}
          sortable={sortable}
          reordering={reordering}
          isDragging={draggingId === node.id}
          isDragOver={dragOverId === node.id}
          onDragStart={setDraggingId}
          onDragEnd={() => {
            setDraggingId(null);
            setDragOverId(null);
          }}
          onDragOverItem={setDragOverId}
          onDropOnItem={handleDrop}
          onReorder={onReorder}
        />
      ))}
      {sortable && draggingId && (
        <div
          aria-hidden
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
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
          className="h-6 rounded-md border border-dashed border-muted-foreground/30"
        />
      )}
    </>
  );
}
