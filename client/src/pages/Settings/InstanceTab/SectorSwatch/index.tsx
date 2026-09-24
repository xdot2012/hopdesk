export const DEFAULT_SECTOR_COLOR = '#2563EB';

type Props = {
  color?: string | null;
  label?: string;
};

export default function SectorSwatch({ color, label }: Props) {
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 rounded-full border border-border"
      style={{ backgroundColor: color || DEFAULT_SECTOR_COLOR }}
      title={label || color || undefined}
      aria-hidden
    />
  );
}
