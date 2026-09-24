import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
} from '~/components/KnowledgeBaseColorPopover';
import { cn } from '~/lib/utils';
import ColorGrid from './ColorGrid';

type PanelLayout = {
  top: number;
  left: number;
  position: 'fixed' | 'absolute';
  container: HTMLElement;
};

type TextStylePopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBeforeOpen?: () => void;
  textColor?: string;
  highlightColor?: string;
  onSelectTextColor: (color: string) => void;
  onSelectHighlight: (color: string) => void;
  children: ReactNode;
};

function getPanelLayout(trigger: HTMLElement): PanelLayout {
  const triggerRect = trigger.getBoundingClientRect();
  const dialog = trigger.closest('[role=dialog]') as HTMLElement | null;

  if (dialog) {
    const dialogRect = dialog.getBoundingClientRect();
    return {
      top: triggerRect.bottom - dialogRect.top + 4,
      left: triggerRect.left - dialogRect.left,
      position: 'absolute',
      container: dialog,
    };
  }

  return {
    top: triggerRect.bottom + 4,
    left: triggerRect.left,
    position: 'fixed',
    container: document.body,
  };
}

export default function TextStylePopover({
  open,
  onOpenChange,
  onBeforeOpen,
  textColor,
  highlightColor,
  onSelectTextColor,
  onSelectHighlight,
  children,
}: TextStylePopoverProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PanelLayout>({
    top: 0,
    left: 0,
    position: 'fixed',
    container: document.body,
  });

  const updateLayout = () => {
    if (!triggerRef.current) return;
    setLayout(getPanelLayout(triggerRef.current));
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateLayout();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    const handleReposition = () => updateLayout();

    const outsideListenerTimer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);

    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.clearTimeout(outsideListenerTimer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, onOpenChange]);

  const panelLayout = triggerRef.current ? getPanelLayout(triggerRef.current) : layout;

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('knowledgeBase.toolbar.textStyle')}
          style={{ top: panelLayout.top, left: panelLayout.left }}
          className={cn(
            panelLayout.position,
            'z-[200] w-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md pointer-events-auto',
          )}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {t('knowledgeBase.toolbar.textColor')}
          </p>
          <ColorGrid
            colors={TEXT_COLORS}
            activeColor={textColor}
            onSelect={(color) => {
              onSelectTextColor(color);
            }}
          />
          <p className="mb-2 mt-3 text-xs font-medium text-muted-foreground">
            {t('knowledgeBase.toolbar.highlight')}
          </p>
          <ColorGrid
            colors={HIGHLIGHT_COLORS}
            activeColor={highlightColor}
            onSelect={(color) => {
              onSelectHighlight(color);
            }}
          />
        </div>,
        panelLayout.container,
      )
    : null;

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseDown={(event) => {
          event.preventDefault();
          if (!open) {
            onBeforeOpen?.();
          }
          onOpenChange(!open);
        }}
      >
        {children}
      </div>
      {panel}
    </>
  );
}
