import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import {
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { scrollPortaledOnWheel } from '~/lib/portaledScroll';
import { cn } from '~/lib/utils';

type SlashCommandId =
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'quote'
  | 'code'
  | 'image'
  | 'video';

type SlashLabelKey =
  | 'knowledgeBase.toolbar.heading2'
  | 'knowledgeBase.toolbar.heading3'
  | 'knowledgeBase.toolbar.bulletList'
  | 'knowledgeBase.toolbar.orderedList'
  | 'knowledgeBase.toolbar.quote'
  | 'knowledgeBase.toolbar.code'
  | 'knowledgeBase.toolbar.image'
  | 'knowledgeBase.toolbar.video';

type SlashCommand = {
  id: SlashCommandId;
  labelKey: SlashLabelKey;
  keywords: string[];
  icon: LucideIcon;
  run: (editor: Editor) => void;
};

type SlashMatch = {
  query: string;
  from: number;
  to: number;
};

type SlashCommandMenuProps = {
  editor: Editor;
  articleId?: string;
  enableMedia?: boolean;
  onImageClick: () => void;
  onVideoClick: () => void;
};

function getSlashMatch(editor: Editor): SlashMatch | null {
  const { $from } = editor.state.selection;
  if (!$from.parent.isTextblock) return null;

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBefore);
  if (!match) return null;

  const query = match[1] ?? '';
  const slashOffset = match[0].startsWith(' ') ? 1 : 0;
  const matchedLength = match[0].length - slashOffset;
  const from = $from.pos - matchedLength;
  const to = $from.pos;

  return { query, from, to };
}

export default function SlashCommandMenu({
  editor,
  articleId,
  enableMedia = true,
  onImageClick,
  onVideoClick,
}: SlashCommandMenuProps) {
  const { t } = useTranslation();
  const [match, setMatch] = useState<SlashMatch | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const commands = useMemo<SlashCommand[]>(
    () => [
      {
        id: 'heading2',
        labelKey: 'knowledgeBase.toolbar.heading2',
        keywords: ['h2', 'titulo', 'título', 'heading', 'title'],
        icon: Heading2,
        run: (current) => current.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'heading3',
        labelKey: 'knowledgeBase.toolbar.heading3',
        keywords: ['h3', 'subtitulo', 'subtítulo', 'subheading'],
        icon: Heading3,
        run: (current) => current.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: 'bulletList',
        labelKey: 'knowledgeBase.toolbar.bulletList',
        keywords: ['lista', 'bullet', 'ul', 'pontilhada'],
        icon: List,
        run: (current) => current.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'orderedList',
        labelKey: 'knowledgeBase.toolbar.orderedList',
        keywords: ['numerada', 'ordered', 'ol', 'numero', 'número'],
        icon: ListOrdered,
        run: (current) => current.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'quote',
        labelKey: 'knowledgeBase.toolbar.quote',
        keywords: ['citacao', 'citação', 'quote', 'blockquote'],
        icon: Quote,
        run: (current) => current.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'code',
        labelKey: 'knowledgeBase.toolbar.code',
        keywords: ['codigo', 'código', 'code'],
        icon: Code,
        run: (current) => current.chain().focus().toggleCode().run(),
      },
      {
        id: 'image',
        labelKey: 'knowledgeBase.toolbar.image',
        keywords: ['imagem', 'image', 'foto', 'img'],
        icon: ImageIcon,
        run: () => {
          if (articleId) onImageClick();
        },
      },
      {
        id: 'video',
        labelKey: 'knowledgeBase.toolbar.video',
        keywords: ['video', 'vídeo', 'youtube'],
        icon: Video,
        run: () => onVideoClick(),
      },
    ],
    [articleId, onImageClick, onVideoClick],
  );

  const filtered = useMemo(() => {
    if (!match) return [];
    const query = match.query.toLowerCase();
    return commands.filter((command) => {
      if ((command.id === 'image' || command.id === 'video') && !enableMedia) return false;
      if (command.id === 'image' && !articleId) return false;
      if (!query) return true;
      const label = t(command.labelKey).toLowerCase();
      return (
        label.includes(query) ||
        command.keywords.some((keyword) => keyword.includes(query) || query.includes(keyword))
      );
    });
  }, [articleId, commands, enableMedia, match, t]);

  const syncMatch = useCallback(() => {
    const next = getSlashMatch(editor);
    setMatch(next);

    if (!next) {
      setCoords(null);
      return;
    }

    // coordsAtPos is viewport-relative; menu must portal to body because Dialog
    // uses transform (translate) which breaks position:fixed descendants.
    const absoluteCoords = editor.view.coordsAtPos(next.from);
    const menuWidth = 224;
    const menuMaxHeight = 256;
    const gap = 8;
    const viewportPadding = 8;

    let top = absoluteCoords.bottom + gap;
    let left = absoluteCoords.left;

    if (top + menuMaxHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, absoluteCoords.top - menuMaxHeight - gap);
    }
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    }
    if (left < viewportPadding) {
      left = viewportPadding;
    }

    setCoords({ top, left });
  }, [editor]);

  const applyCommand = useCallback(
    (command: SlashCommand) => {
      if (!match) return;

      editor.chain().focus().deleteRange({ from: match.from, to: match.to }).run();
      command.run(editor);
      setMatch(null);
      setCoords(null);
    },
    [editor, match],
  );

  useEffect(() => {
    syncMatch();

    const handleUpdate = () => syncMatch();
    const handleSelection = () => syncMatch();
    const handleReposition = () => syncMatch();

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleSelection);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleSelection);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [editor, syncMatch]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [match?.query]);

  useEffect(() => {
    if (!match || filtered.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((index) => (index + 1) % filtered.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((index) => (index - 1 + filtered.length) % filtered.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const command = filtered[selectedIndex];
        if (command) applyCommand(command);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setMatch(null);
        setCoords(null);
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('keydown', handleKeyDown, true);
    return () => dom.removeEventListener('keydown', handleKeyDown, true);
  }, [applyCommand, editor, filtered, match, selectedIndex]);

  if (!match || !coords || filtered.length === 0) {
    return null;
  }

  return createPortal(
    <div
      role="listbox"
      aria-label={t('knowledgeBase.slashMenu')}
      className="rich-text-editor-slash-menu pointer-events-auto fixed z-[210] max-h-64 w-56 overflow-y-auto overscroll-contain rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{ top: coords.top, left: coords.left }}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={scrollPortaledOnWheel}
    >
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        {t('knowledgeBase.slashMenu')}
      </p>
      {filtered.map((command, index) => {
        const Icon = command.icon;
        return (
          <button
            key={command.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground',
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              applyCommand(command);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Icon className="size-4 shrink-0" />
            {t(command.labelKey)}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
