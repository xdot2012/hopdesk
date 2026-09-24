import type { KnowledgeBaseArticleTreeNode } from '~/api/knowledgeBase';
import { cn } from '~/lib/utils';
import TreeSiblingList from './TreeSiblingList';

type KnowledgeBaseTreeProps = {
  nodes: KnowledgeBaseArticleTreeNode[];
  className?: string;
  activeArticleRef?: string | null;
  onSelectArticle?: (idOrSlug: string) => void;
  onNewChildArticle?: (parentId: string) => void;
  sortable?: boolean;
  reordering?: boolean;
  onReorder?: (parentId: string | null, orderedIds: string[]) => Promise<void>;
};

export default function KnowledgeBaseTree({
  nodes,
  className,
  activeArticleRef,
  onSelectArticle,
  onNewChildArticle,
  sortable = false,
  reordering = false,
  onReorder,
}: KnowledgeBaseTreeProps) {
  return (
    <nav className={cn('space-y-0.5', className)} aria-label="Knowledge base tree">
      <TreeSiblingList
        siblings={nodes}
        depth={0}
        parentId={null}
        activeArticleRef={activeArticleRef}
        onSelectArticle={onSelectArticle}
        onNewChildArticle={onNewChildArticle}
        sortable={sortable}
        reordering={reordering}
        onReorder={onReorder}
      />
    </nav>
  );
}
