import { cn } from '~/lib/utils';

interface LogoWordmarkProps {
  className?: string;
}

/** Wordmark HopDesk — Hop em teal, Desk em tom escuro. */
export default function LogoWordmark({ className }: LogoWordmarkProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-sans select-none',
        className,
      )}
    >
      <span className="font-semibold tracking-wide text-primary">Hop</span>
      <span className="font-bold tracking-tight text-foreground">Desk</span>
    </span>
  );
}
