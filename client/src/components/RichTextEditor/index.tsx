import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTextSelection } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { useTranslation } from 'react-i18next';
import { uploadKnowledgeBaseInlineImage } from '~/api/knowledgeBase';
import { fetchAuthenticatedFileBlobUrl, rewriteAuthenticatedImages } from '~/lib/authenticatedFiles';
import { resolveFileUrl } from '~/lib/files';
import { cn } from '~/lib/utils';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import MentionMenu, {
  createEmptyMentionBridge,
  fetchMentionSuggestionItems,
  type MentionSuggestionBridge,
} from './MentionMenu';
import ResizableYoutube from './resizableYoutube';
import SlashCommandMenu from './SlashCommandMenu';
import RichTextEditorToolbar from './Toolbar';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  articleId?: string;
  borderless?: boolean;
  enableMedia?: boolean;
  enableMentions?: boolean;
  placeholder?: string;
  compactToolbar?: boolean;
};

const bubbleMenuOptions = {
  placement: 'top' as const,
  offset: 10,
  flip: false,
  shift: { padding: 8 },
  strategy: 'fixed' as const,
};

const bubbleMenuAppendTo = () => document.body;

export default function RichTextEditor({
  value,
  onChange,
  className,
  articleId,
  borderless = false,
  enableMedia = true,
  enableMentions = false,
  placeholder: placeholderProp,
  compactToolbar = false,
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const { showErrorSnack } = useAlertStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSettingContentRef = useRef(false);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const editorPointerInsideRef = useRef(false);
  const toolbarDismissedRef = useRef(false);
  const lastTypingAtRef = useRef(0);
  const menuHoveredRef = useRef(false);
  const hideMenuTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bubbleMenuRef = useRef<HTMLDivElement>(null);
  const popoverOpenRef = useRef(false);
  const mentionBridgeRef = useRef<MentionSuggestionBridge>(createEmptyMentionBridge());
  const [linkOpen, setLinkOpen] = useState(false);
  const [textStyleOpen, setTextStyleOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const placeholder =
    placeholderProp ||
    (borderless
      ? t('knowledgeBase.editorPlaceholderSlash')
      : t('knowledgeBase.editorPlaceholder'));

  const mentionExtension = useMemo(() => {
    if (!enableMentions) return null;
    return Mention.configure({
      HTMLAttributes: {
        class: 'mention',
      },
      deleteTriggerWithBackspace: true,
      suggestion: {
        char: '@',
        allowSpaces: false,
        items: async ({ query }: { query: string }) => fetchMentionSuggestionItems(query),
        render: () => ({
          onStart: (props) => mentionBridgeRef.current.onStart(props),
          onUpdate: (props) => mentionBridgeRef.current.onUpdate(props),
          onExit: () => mentionBridgeRef.current.onExit(),
          onKeyDown: (props) => mentionBridgeRef.current.onKeyDown(props),
        }),
      },
    });
  }, [enableMentions]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      ...(enableMedia
        ? [
            Image.configure({
              HTMLAttributes: {
                class: 'rounded-lg h-auto my-4',
              },
              resize: {
                enabled: true,
                minWidth: 80,
                minHeight: 80,
                alwaysPreserveAspectRatio: true,
                directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
              },
            }),
            ResizableYoutube.configure({
              width: 640,
              height: 360,
              HTMLAttributes: {
                class: 'rounded-lg my-4',
              },
            }),
          ]
        : []),
      ...(mentionExtension ? [mentionExtension] : []),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor: current }) => {
      if (isSettingContentRef.current) return;
      onChange(current.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'max-w-none outline-none leading-relaxed',
          borderless
            ? 'min-h-[50vh] px-0 py-1 text-base'
            : compactToolbar
              ? 'min-h-[4.5rem] px-3 py-2 text-sm'
              : 'min-h-40 px-3 py-2 text-sm',
          '[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold',
          '[&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold',
          '[&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold',
          '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
          '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
          '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
          '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs',
          '[&_img]:my-4 max-w-full rounded-lg',
          '[&_mark]:rounded-sm [&_mark]:px-0.5',
          '[&_[data-youtube-video]]:my-4',
        ),
      },
    },
  }, [enableMedia, mentionExtension, placeholder]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      const { from, to, empty } = editor.state.selection;
      const wasFocused = editor.view.hasFocus();

      isSettingContentRef.current = true;
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });

      if (wasFocused) {
        const maxPos = editor.state.doc.content.size;
        const safeFrom = Math.min(from, maxPos);
        const safeTo = Math.min(to, maxPos);

        if (empty) {
          editor.commands.setTextSelection(safeFrom);
        } else {
          editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
        }
      }

      isSettingContentRef.current = false;
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;

    const rewrite = () => {
      void rewriteAuthenticatedImages(editor.view.dom);
    };

    rewrite();
    editor.on('update', rewrite);
    return () => {
      editor.off('update', rewrite);
    };
  }, [editor, value]);

  popoverOpenRef.current =
    linkOpen || textStyleOpen || alignOpen || moreOpen;

  const refreshBubbleMenu = useCallback(() => {
    if (!editor?.view) return;
    editor.view.dispatch(editor.state.tr);
  }, [editor]);

  const scheduleBubbleMenuHide = useCallback(() => {
    if (hideMenuTimerRef.current) {
      clearTimeout(hideMenuTimerRef.current);
    }

    hideMenuTimerRef.current = setTimeout(() => {
      if (
        !editorPointerInsideRef.current &&
        !menuHoveredRef.current &&
        !popoverOpenRef.current
      ) {
        refreshBubbleMenu();
      }
    }, 120);
  }, [refreshBubbleMenu]);

  const dismissBubbleMenu = useCallback(() => {
    if (popoverOpenRef.current) return;

    toolbarDismissedRef.current = true;
    menuHoveredRef.current = false;
    refreshBubbleMenu();
  }, [refreshBubbleMenu]);

  const isInsideFormattingUi = useCallback(
    (target: Node | null) => {
      if (!target || !editor?.view.dom) return false;
      if (editor.view.dom.contains(target)) return true;
      if (bubbleMenuRef.current?.contains(target)) return true;
      if ((target as Element).closest?.('[data-radix-popper-content-wrapper]')) return true;
      if (
        (target as Element).closest?.(
          '.rich-text-editor-slash-menu, .rich-text-editor-mention-menu',
        )
      ) {
        return true;
      }
      return false;
    },
    [editor],
  );

  const finishPointerInteraction = useCallback(() => {
    if (!editor) return;

    const { empty } = editor.state.selection;
    if (!empty) {
      toolbarDismissedRef.current = false;
      refreshBubbleMenu();
      return;
    }

    dismissBubbleMenu();
  }, [dismissBubbleMenu, editor, refreshBubbleMenu]);

  const handleEditorMouseEnter = useCallback(() => {
    if (hideMenuTimerRef.current) {
      clearTimeout(hideMenuTimerRef.current);
    }
    editorPointerInsideRef.current = true;
    toolbarDismissedRef.current = false;
    refreshBubbleMenu();
  }, [refreshBubbleMenu]);

  const handleEditorMouseLeave = useCallback(() => {
    editorPointerInsideRef.current = false;
    if (!popoverOpenRef.current) {
      toolbarDismissedRef.current = true;
      menuHoveredRef.current = false;
    }
    refreshBubbleMenu();
  }, [refreshBubbleMenu]);

  const handleEditorMouseMove = useCallback(() => {
    if (!toolbarDismissedRef.current) return;
    if (Date.now() - lastTypingAtRef.current < 350) return;

    toolbarDismissedRef.current = false;
    refreshBubbleMenu();
  }, [refreshBubbleMenu]);

  const handleEditorMouseDown = useCallback(() => {
    editorPointerInsideRef.current = true;

    const handleDocumentMouseUp = () => {
      finishPointerInteraction();
    };

    document.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
  }, [finishPointerInteraction]);

  const handleEditorMouseUp = useCallback(() => {
    finishPointerInteraction();
  }, [finishPointerInteraction]);

  const handleMenuMouseEnter = useCallback(() => {
    if (hideMenuTimerRef.current) {
      clearTimeout(hideMenuTimerRef.current);
    }
    menuHoveredRef.current = true;
    refreshBubbleMenu();
  }, [refreshBubbleMenu]);

  const handleMenuMouseLeave = useCallback(() => {
    menuHoveredRef.current = false;
    scheduleBubbleMenuHide();
  }, [scheduleBubbleMenuHide]);

  useEffect(() => {
    if (!editor || !borderless) return;

    const dom = editor.view.dom;

    const handleEditorKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Shift' ||
        event.key === 'Control' ||
        event.key === 'Alt' ||
        event.key === 'Meta'
      ) {
        return;
      }

      lastTypingAtRef.current = Date.now();
      dismissBubbleMenu();
    };

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (popoverOpenRef.current) return;
      if (isInsideFormattingUi(event.target as Node)) return;

      dismissBubbleMenu();
      editorPointerInsideRef.current = false;
    };

    const handleBlur = ({ event }: { event: FocusEvent }) => {
      if (popoverOpenRef.current) return;
      if (isInsideFormattingUi(event.relatedTarget as Node | null)) return;

      dismissBubbleMenu();
      editorPointerInsideRef.current = false;
    };

    dom.addEventListener('mouseenter', handleEditorMouseEnter);
    dom.addEventListener('mouseleave', handleEditorMouseLeave);
    dom.addEventListener('mousedown', handleEditorMouseDown);
    dom.addEventListener('mouseup', handleEditorMouseUp);
    dom.addEventListener('mousemove', handleEditorMouseMove);
    dom.addEventListener('keydown', handleEditorKeyDown);
    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    editor.on('blur', handleBlur);

    return () => {
      dom.removeEventListener('mouseenter', handleEditorMouseEnter);
      dom.removeEventListener('mouseleave', handleEditorMouseLeave);
      dom.removeEventListener('mousedown', handleEditorMouseDown);
      dom.removeEventListener('mouseup', handleEditorMouseUp);
      dom.removeEventListener('mousemove', handleEditorMouseMove);
      dom.removeEventListener('keydown', handleEditorKeyDown);
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      editor.off('blur', handleBlur);
      if (hideMenuTimerRef.current) {
        clearTimeout(hideMenuTimerRef.current);
      }
    };
  }, [
    borderless,
    dismissBubbleMenu,
    editor,
    finishPointerInteraction,
    handleEditorMouseEnter,
    handleEditorMouseLeave,
    handleEditorMouseDown,
    handleEditorMouseUp,
    handleEditorMouseMove,
    isInsideFormattingUi,
  ]);

  useEffect(() => {
    if (!popoverOpenRef.current || !editor) return;
    refreshBubbleMenu();
  }, [alignOpen, editor, linkOpen, moreOpen, refreshBubbleMenu, textStyleOpen]);

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor || !articleId) {
        showErrorSnack(t('knowledgeBase.imageRequiresSave'));
        return;
      }
      try {
        const stored = await uploadKnowledgeBaseInlineImage(articleId, file);
        const permanentSrc = resolveFileUrl(stored.key) || stored.url;
        if (!permanentSrc) return;
        // TipTap persiste a URL canônica; o DOM é reescrito para blob autenticado.
        editor.chain().focus().setImage({ src: permanentSrc, alt: file.name }).run();
        await fetchAuthenticatedFileBlobUrl(permanentSrc);
        void rewriteAuthenticatedImages(editor.view.dom);
      } catch (error: unknown) {
        showErrorSnack(getApiErrorMessage(error, t('knowledgeBase.imageUploadError')));
      }
    },
    [articleId, editor, showErrorSnack, t],
  );

  const insertYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(t('knowledgeBase.videoPrompt'), 'https://www.youtube.com/watch?v=');
    if (!url?.trim()) return;
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
  }, [editor, t]);

  const rememberSelection = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    selectionRef.current = { from, to };
  };

  const applyWithSelection = useCallback(
    (
      apply: (
        chain: ReturnType<NonNullable<typeof editor>['chain']>,
      ) => ReturnType<NonNullable<typeof editor>['chain']>,
    ) => {
      if (!editor) return;
      const saved = selectionRef.current;
      let chain = editor.chain().focus();
      if (saved) {
        chain = chain.setTextSelection(saved);
      }
      apply(chain).run();
      selectionRef.current = null;
    },
    [editor],
  );

  const bubbleMenuShouldShow = useCallback(
    ({
      editor: currentEditor,
      state,
      view,
      from,
      to,
      element,
    }: {
      editor: NonNullable<typeof editor>;
      state: NonNullable<typeof editor>['state'];
      view: NonNullable<typeof editor>['view'];
      from: number;
      to: number;
      element: HTMLElement;
    }) => {
      if (!currentEditor.isEditable) return false;
      if (currentEditor.isActive('image') || currentEditor.isActive('youtube')) return false;

      const menuHasFocus = element.contains(document.activeElement);
      const { empty } = state.selection;
      const hasTextSelection = !empty && state.doc.textBetween(from, to).length > 0;

      if (hasTextSelection) {
        if (toolbarDismissedRef.current && !menuHasFocus && !popoverOpenRef.current) {
          return false;
        }

        return view.hasFocus() || menuHasFocus;
      }

      const canShowFromHover =
        (editorPointerInsideRef.current && !toolbarDismissedRef.current) ||
        menuHoveredRef.current ||
        popoverOpenRef.current;

      if (!canShowFromHover && !menuHasFocus) return false;
      if (!(view.hasFocus() || menuHasFocus || editorPointerInsideRef.current)) return false;

      return isTextSelection(state.selection) && state.selection.$from.parent.isTextblock;
    },
    [],
  );

  const toolbarProps = useMemo(
    () => ({
      editor,
      t,
      articleId,
      enableMedia,
      variant: borderless || compactToolbar ? ('compact' as const) : ('full' as const),
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
      onImageClick: () => fileInputRef.current?.click(),
      onVideoClick: insertYoutube,
    }),
    [
      alignOpen,
      applyWithSelection,
      articleId,
      borderless,
      compactToolbar,
      editor,
      enableMedia,
      insertYoutube,
      linkOpen,
      moreOpen,
      t,
      textStyleOpen,
    ],
  );

  if (!editor) {
    return null;
  }

  const toolbarClassName = cn(
    'flex flex-nowrap items-center gap-0.5',
    borderless ? 'p-1' : 'p-1',
  );

  return (
    <div
      className={cn(
        'rich-text-editor',
        borderless && 'rich-text-editor--borderless',
        !borderless && 'rounded-md border border-input bg-background',
        className,
      )}
    >
      {borderless ? (
        <BubbleMenu
          ref={bubbleMenuRef}
          editor={editor}
          updateDelay={100}
          appendTo={bubbleMenuAppendTo}
          shouldShow={bubbleMenuShouldShow}
          options={bubbleMenuOptions}
          className="rich-text-editor-bubble-menu pointer-events-auto z-50 rounded-md border border-border bg-background p-1 shadow-lg"
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          <RichTextEditorToolbar
            {...toolbarProps}
            editor={editor}
            className={toolbarClassName}
          />
        </BubbleMenu>
      ) : (
        <div className={cn(toolbarClassName, 'border-b border-border')}>
          <RichTextEditorToolbar {...toolbarProps} editor={editor} />
        </div>
      )}

      {enableMedia ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void insertImage(file);
            }
          }}
        />
      ) : null}

      <EditorContent editor={editor} />

      <SlashCommandMenu
        editor={editor}
        articleId={articleId}
        enableMedia={enableMedia}
        onImageClick={() => fileInputRef.current?.click()}
        onVideoClick={insertYoutube}
      />
      {enableMentions ? <MentionMenu editor={editor} bridgeRef={mentionBridgeRef} /> : null}
    </div>
  );
}
