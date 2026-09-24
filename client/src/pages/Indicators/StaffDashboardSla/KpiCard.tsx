import { Card, CardContent } from '~/components/ui/card';

type Props = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function KpiCard({ label, value, hint }: Props) {
  return (
    <Card className="h-full border-primary/25 bg-primary/10">
      <CardContent className="flex h-full flex-col items-center gap-1 p-4 text-center">
        <p className="text-xs font-medium text-primary sm:text-sm">{label}</p>
        <div className="mt-auto flex flex-col items-center gap-1">
          <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="text-[0.65rem] text-muted-foreground sm:text-xs">
              {hint}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
