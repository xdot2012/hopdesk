import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { KnowledgeBaseArticleTreeNode } from '~/api/knowledgeBase';
import { cn } from '~/lib/utils';

type ParentTreeOptionsProps = {
  nodes: KnowledgeBaseArticleTreeNode[];
  depth: number;
  value: string;
  onSelect: (id: string) => void;
  excludeId?: string;
};

export default function ParentTreeOptions({
  nodes,
  depth,
  value,
  onSelect,
  excludeId,
}: ParentTreeOptionsProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  return (
    <>
      {nodes.map((node) => {
        if (node.id === excludeId) return null;
        const hasChildren = node.children.length > 0;
        const isOpen = openIds.has(node.id);
        return (
          <div key={node.id}>
            <div className="flex items-center" style={{ paddingLeft: depth * 12 }}>
              {hasChildren ? (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                  onClick={() =>
                    setOpenIds((current) => {
                      const next = new Set(current);
                      if (next.has(node.id)) next.delete(node.id);
                      else next.add(node.id);
                      return next;
                    })
                  }
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="inline-block h-7 w-7" />
              )}
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                  value === node.id && 'bg-accent font-medium',
                )}
                onClick={() => onSelect(node.id)}
              >
                {node.title}
              </button>
            </div>
            {hasChildren && isOpen && (
              <ParentTreeOptions
                nodes={node.children}
                depth={depth + 1}
                value={value}
                onSelect={onSelect}
                excludeId={excludeId}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
