import { useRef } from 'react';
import { cn } from '~/lib/utils';

type Props = {
  value: string;
  onChange: (color: string) => void;
  'aria-label'?: string;
  className?: string;
  size?: 'sm' | 'default';
};

const PICKER_WIDTH = 300;
const PICKER_HEIGHT = 360;
const VIEWPORT_PADDING = 16;

function anchorPosition(trigger: DOMRect) {
  let left = trigger.left - PICKER_WIDTH;
  let top = trigger.top + trigger.height / 2 - PICKER_HEIGHT / 2;

  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
  if (top < VIEWPORT_PADDING) top = VIEWPORT_PADDING;
  if (top + PICKER_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
    top = window.innerHeight - PICKER_HEIGHT - VIEWPORT_PADDING;
  }

  return { left, top };
}

/** Swatch trigger; opens the native color picker to the left of the button. */
export default function ColorPickerField({
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
  size = 'sm',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const compact = size === 'sm';

  const openPicker = () => {
    const input = inputRef.current;
    const trigger = triggerRef.current;
    if (!input || !trigger) return;

    const { left, top } = anchorPosition(trigger.getBoundingClientRect());
    Object.assign(input.style, {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: '1px',
      height: '1px',
      opacity: '0',
      zIndex: '9999',
    });

    try {
      input.showPicker();
    } catch {
      input.click();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={cn(
          'shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5 transition-colors hover:bg-muted/40',
          compact ? 'h-7 w-10' : 'h-9 w-12',
          className,
        )}
        aria-label={ariaLabel}
      >
        <span
          className="block h-full w-full rounded-sm border border-border/50"
          style={{ backgroundColor: value }}
          aria-hidden
        />
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        tabIndex={-1}
        aria-hidden
        className="fixed opacity-0"
      />
    </>
  );
}
