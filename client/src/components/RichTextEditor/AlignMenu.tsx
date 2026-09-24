import type { Editor } from '@tiptap/core';
import type { TFunction } from 'i18next';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import AlignIcon from './AlignIcon';

type AlignMenuProps = {
  editor: Editor;
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AlignMenu({ editor, t, open, onOpenChange }: AlignMenuProps) {
  const options = [
    { align: 'left' as const, icon: AlignLeft, label: t('knowledgeBase.toolbar.alignLeft') },
    { align: 'center' as const, icon: AlignCenter, label: t('knowledgeBase.toolbar.alignCenter') },
    { align: 'right' as const, icon: AlignRight, label: t('knowledgeBase.toolbar.alignRight') },
    { align: 'justify' as const, icon: AlignJustify, label: t('knowledgeBase.toolbar.alignJustify') },
  ];

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={
            editor.isActive({ textAlign: 'center' }) ||
            editor.isActive({ textAlign: 'right' }) ||
            editor.isActive({ textAlign: 'justify' })
              ? 'secondary'
              : 'ghost'
          }
          size="icon"
          className="h-8 w-8"
          onMouseDown={(event) => event.preventDefault()}
          aria-label={t('knowledgeBase.toolbar.align')}
          title={t('knowledgeBase.toolbar.align')}
        >
          <AlignIcon editor={editor} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {options.map(({ align, icon: Icon, label }) => (
          <DropdownMenuItem key={align} onSelect={() => editor.chain().focus().setTextAlign(align).run()}>
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
