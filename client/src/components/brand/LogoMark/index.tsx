import { cn } from '~/lib/utils';

interface LogoMarkProps {
  className?: string;
}

/** Mark HopDesk — sapo em squircle mint. */
export default function LogoMark({ className }: LogoMarkProps) {
  return (
    <img
      src="/hopdesk-mark.png"
      alt=""
      aria-hidden
      draggable={false}
      className={cn('object-contain select-none', className)}
    />
  );
}
