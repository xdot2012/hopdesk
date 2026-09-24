import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

type ColorGridProps = {
  colors: ReadonlyArray<{ label: string; value: string }>;
  activeColor?: string;
  onSelect: (color: string) => void;
};

export default function ColorGrid({ colors, activeColor, onSelect }: ColorGridProps) {
  const { t } = useTranslation();

  return (
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
            onSelect(color.value);
          }}
        >
          {color.value ? (
            <span className="block h-4 w-4 rounded-sm" style={{ backgroundColor: color.value }} />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">A</span>
          )}
        </button>
      ))}
    </div>
  );
}
