import type { Editor } from '@tiptap/core';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MoreHorizontal,
  Palette,
  Quote,
  Code,
  Strikethrough,
  Underline,
  Video,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import KnowledgeBaseLinkPopover from '~/components/KnowledgeBaseLinkPopover';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import AlignMenu from './AlignMenu';
import TextStylePopover from './TextStylePopover';
import ToolbarButton from './ToolbarButton';
import ToolbarSeparator from './ToolbarSeparator';

type ToolbarVariant = 'full' | 'compact';

type RichTextEditorToolbarProps = {
  editor: Editor;
  t: TFunction;
  articleId?: string;
  enableMedia?: boolean;
  variant?: ToolbarVariant;
  linkOpen: boolean;
  setLinkOpen: (open: boolean) => void;
  textStyleOpen: boolean;
  setTextStyleOpen: (open: boolean) => void;
  alignOpen: boolean;
  setAlignOpen: (open: boolean) => void;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  rememberSelection: () => void;
  applyWithSelection: (
    apply: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>,
  ) => void;
  onImageClick: () => void;
  onVideoClick: () => void;
  className?: string;
};

export default function RichTextEditorToolbar({
  editor,
  t,
  articleId,
  enableMedia = true,
  variant = 'full',
  linkOpen,
  setLinkOpen,
  textStyleOpen,
  setTextStyleOpen,
  alignOpen,
  setAlignOpen,
  moreOpen,
  setMoreOpen,
  rememberSelection,
  applyWithSelection,
  onImageClick,
  onVideoClick,
  className,
}: RichTextEditorToolbarProps) {
  const currentLink = editor.getAttributes('link').href as string | undefined;
  const currentTextColor = editor.getAttributes('textStyle').color as string | undefined;
  const currentHighlight = editor.getAttributes('highlight').color as string | undefined;
  const isCompact = variant === 'compact';

  const textStyleControl = (
    <TextStylePopover
      open={textStyleOpen}
      onBeforeOpen={rememberSelection}
      onOpenChange={setTextStyleOpen}
      textColor={currentTextColor}
      highlightColor={currentHighlight}
      onSelectTextColor={(color) => {
        applyWithSelection((chain) => {
          if (!color) return chain.unsetColor();
          return chain.setColor(color);
        });
      }}
      onSelectHighlight={(color) => {
        applyWithSelection((chain) => {
          if (!color) return chain.unsetHighlight();
          return chain.setHighlight({ color });
        });
      }}
    >
      <ToolbarButton
        active={Boolean(currentTextColor) || editor.isActive('highlight')}
        label={t('knowledgeBase.toolbar.textStyle')}
      >
        <Palette />
      </ToolbarButton>
    </TextStylePopover>
  );

  const linkControl = (
    <KnowledgeBaseLinkPopover
      open={linkOpen}
      onOpenChange={setLinkOpen}
      initialUrl={currentLink}
      onApply={(url) => {
        if (!url) {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }}
      onRemove={
        editor.isActive('link')
          ? () => editor.chain().focus().extendMarkRange('link').unsetLink().run()
          : undefined
      }
    >
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={() => setLinkOpen(true)}
        label={`${t('knowledgeBase.toolbar.link')} (Ctrl+K)`}
      >
        <LinkIcon />
      </ToolbarButton>
    </KnowledgeBaseLinkPopover>
  );

  if (isCompact) {
    return (
      <div className={cn('flex flex-nowrap items-center gap-0.5', className)}>
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label={`${t('knowledgeBase.toolbar.bold')} (Ctrl+B)`}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label={`${t('knowledgeBase.toolbar.italic')} (Ctrl+I)`}
        >
          <Italic />
        </ToolbarButton>

        <ToolbarSeparator />

        {textStyleControl}
        {linkControl}

        <ToolbarSeparator />

        <DropdownMenu modal={false} open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={moreOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onMouseDown={(event) => event.preventDefault()}
              aria-label={t('knowledgeBase.toolbar.more')}
              title={t('knowledgeBase.toolbar.more')}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleUnderline().run()}
            >
              <Underline />
              {t('knowledgeBase.toolbar.underline')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough />
              {t('knowledgeBase.toolbar.strikethrough')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 />
              {t('knowledgeBase.toolbar.heading2')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 />
              {t('knowledgeBase.toolbar.heading3')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft />
              {t('knowledgeBase.toolbar.alignLeft')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter />
              {t('knowledgeBase.toolbar.alignCenter')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight />
              {t('knowledgeBase.toolbar.alignRight')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setTextAlign('justify').run()}
            >
              <AlignJustify />
              {t('knowledgeBase.toolbar.alignJustify')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List />
              {t('knowledgeBase.toolbar.bulletList')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered />
              {t('knowledgeBase.toolbar.orderedList')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote />
              {t('knowledgeBase.toolbar.quote')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleCode().run()}
            >
              <Code />
              {t('knowledgeBase.toolbar.code')}
            </DropdownMenuItem>
            {enableMedia ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!articleId}
                  onSelect={() => {
                    if (articleId) onImageClick();
                  }}
                >
                  <ImageIcon />
                  {t('knowledgeBase.toolbar.image')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onVideoClick}>
                  <Video />
                  {t('knowledgeBase.toolbar.video')}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-nowrap items-center gap-0.5', className)}>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label={t('knowledgeBase.toolbar.heading2')}
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label={t('knowledgeBase.toolbar.heading3')}
      >
        <Heading3 />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label={`${t('knowledgeBase.toolbar.bold')} (Ctrl+B)`}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label={`${t('knowledgeBase.toolbar.italic')} (Ctrl+I)`}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label={`${t('knowledgeBase.toolbar.underline')} (Ctrl+U)`}
      >
        <Underline />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label={t('knowledgeBase.toolbar.strikethrough')}
      >
        <Strikethrough />
      </ToolbarButton>

      <ToolbarSeparator />

      {textStyleControl}

      <AlignMenu editor={editor} t={t} open={alignOpen} onOpenChange={setAlignOpen} />

      <ToolbarSeparator />

      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label={t('knowledgeBase.toolbar.bulletList')}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label={t('knowledgeBase.toolbar.orderedList')}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label={t('knowledgeBase.toolbar.quote')}
      >
        <Quote />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        label={t('knowledgeBase.toolbar.code')}
      >
        <Code />
      </ToolbarButton>

      <ToolbarSeparator />

      {linkControl}

      {enableMedia ? (
        <>
          <ToolbarButton
            onClick={onImageClick}
            label={t('knowledgeBase.toolbar.image')}
            disabled={!articleId}
          >
            <ImageIcon />
          </ToolbarButton>
          <ToolbarButton onClick={onVideoClick} label={t('knowledgeBase.toolbar.video')}>
            <Video />
          </ToolbarButton>
        </>
      ) : null}
    </div>
  );
}

export type { RichTextEditorToolbarProps, ToolbarVariant };
