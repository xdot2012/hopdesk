import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { KnowledgeBaseArticleTreeNode } from '~/api/knowledgeBase';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import ParentTreeOptions from './ParentTreeOptions';

type KnowledgeBaseParentPickerProps = {
  tree: KnowledgeBaseArticleTreeNode[];
  value: string;
  onValueChange: (value: string) => void;
  excludeId?: string;
  allowRoot?: boolean;
};

export default function KnowledgeBaseParentPicker({
  tree,
  value,
  onValueChange,
  excludeId,
  allowRoot = true,
}: KnowledgeBaseParentPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: KnowledgeBaseArticleTreeNode[]) => {
      nodes.forEach((node) => {
        map.set(node.id, node.title);
        walk(node.children);
      });
    };
    walk(tree);
    return map;
  }, [tree]);

  const displayLabel = value
    ? labelMap.get(value) || t('knowledgeBase.selectParent')
    : t('knowledgeBase.noParent');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <div className="max-h-64 overflow-y-auto">
          {allowRoot && (
            <button
              type="button"
              className={cn(
                'w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                !value && 'bg-accent font-medium',
              )}
              onClick={() => {
                onValueChange('');
                setOpen(false);
              }}
            >
              {t('knowledgeBase.noParent')}
            </button>
          )}
          <ParentTreeOptions
            nodes={tree}
            depth={0}
            value={value}
            excludeId={excludeId}
            onSelect={(id) => {
              onValueChange(id);
              setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
