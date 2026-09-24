import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

export const TEXT_COLORS = [
  { label: 'default', value: '' },
  { label: 'gray', value: '#787774' },
  { label: 'brown', value: '#9f6b53' },
  { label: 'orange', value: '#d9730d' },
  { label: 'yellow', value: '#cb912f' },
  { label: 'green', value: '#448361' },
  { label: 'blue', value: '#337ea9' },
  { label: 'purple', value: '#9065b0' },
  { label: 'pink', value: '#c14c8a' },
  { label: 'red', value: '#d44c47' },
] as const;

export const HIGHLIGHT_COLORS = [
  { label: 'default', value: '' },
  { label: 'gray', value: '#ebeced' },
  { label: 'brown', value: '#f4eadd' },
  { label: 'orange', value: '#fadec9' },
  { label: 'yellow', value: '#fdecc8' },
  { label: 'green', value: '#dbeddb' },
  { label: 'blue', value: '#d3e5ef' },
  { label: 'purple', value: '#e8deee' },
  { label: 'pink', value: '#f5e0e9' },
  { label: 'red', value: '#ffe2dd' },
] as const;

type PanelLayout = {
  top: number;
  left: number;
  position: 'fixed' | 'absolute';
  container: HTMLElement;
};

type KnowledgeBaseColorPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBeforeOpen?: () => void;
  colors: ReadonlyArray<{ label: string; value: string }>;
  activeColor?: string;
  onSelect: (color: string) => void;
  title: string;
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

export default function KnowledgeBaseColorPopover({
  open,
  onOpenChange,
  onBeforeOpen,
  colors,
  activeColor,
  onSelect,
  title,
  children,
}: KnowledgeBaseColorPopoverProps) {
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

  const handleColorSelect = (color: string) => {
    onSelect(color);
    onOpenChange(false);
  };

  const panelLayout = triggerRef.current ? getPanelLayout(triggerRef.current) : layout;

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          style={{ top: panelLayout.top, left: panelLayout.left }}
          className={cn(
            panelLayout.position,
            'z-[200] w-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md pointer-events-auto',
          )}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
          <div className="grid grid-cols-5 gap-1">
            {colors.map((color) => (
              <button
                key={color.label}
                type="button"
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background p-0 transition-colors hover:bg-accent',
                  activeColor === color.value && 'ring-2 ring-primary ring-offset-1',
                )}
                aria-label={t(`knowledgeBase.toolbar.color.${color.label}` as 'knowledgeBase.toolbar.color.default')}
                title={t(`knowledgeBase.toolbar.color.${color.label}` as 'knowledgeBase.toolbar.color.default')}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleColorSelect(color.value);
                }}
              >
                {color.value ? (
                  <span
                    className="block h-4 w-4 rounded-sm"
                    style={{ backgroundColor: color.value }}
                  />
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">A</span>
                )}
              </button>
            ))}
          </div>
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
