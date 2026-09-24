import { ReactNode } from 'react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface Props {
  children?: ReactNode;
  show: boolean;
  severity: 'success' | 'warning' | 'error' | 'info';
  variant: 'filled' | 'outlined' | 'standard';
  handleClose: () => void;
}

export default function PageMessage({ children, show, severity, handleClose }: Props) {
  if (!show) return null;

  return (
    <Alert
      variant={severity === 'error' ? 'destructive' : 'default'}
      className={cn('relative mb-4 w-full')}
    >
      <AlertDescription className="pr-8">{children}</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleClose}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
