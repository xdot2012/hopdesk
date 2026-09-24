import type { ReactNode } from 'react';
import { Button } from '~/components/ui/button';

type ToolbarButtonProps = {
  active?: boolean;
  onClick?: () => void;
  label: string;
  children: ReactNode;
  disabled?: boolean;
};

export default function ToolbarButton({
  active,
  onClick,
  label,
  children,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
