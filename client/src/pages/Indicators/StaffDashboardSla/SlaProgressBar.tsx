type Props = {
  label: string;
  fulfilled: number;
  failed: number;
  withinLabel: string;
  outsideLabel: string;
};

function rateOf(fulfilled: number, failed: number): number | null {
  const total = fulfilled + failed;
  if (total === 0) return null;
  return Math.round((fulfilled / total) * 1000) / 10;
}

export default function SlaProgressBar({
  label,
  fulfilled,
  failed,
  withinLabel,
  outsideLabel,
}: Props) {
  const rate = rateOf(fulfilled, failed);
  const width = rate ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-foreground">
          {rate == null ? '—' : `${rate}%`}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--chart-sla-ok)] transition-[width]"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {withinLabel}:{' '}
        <span className="tabular-nums text-foreground">{fulfilled}</span>
        {' · '}
        {outsideLabel}:{' '}
        <span className="tabular-nums text-foreground">{failed}</span>
      </p>
    </div>
  );
}
