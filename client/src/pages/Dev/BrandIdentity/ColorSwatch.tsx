import { cn } from '~/lib/utils';

type ColorSwatchProps = {
  name: string;
  role?: string;
  swatch: string;
  hex?: string;
  token: string;
};

export default function ColorSwatch({ name, role, swatch, hex, token }: ColorSwatchProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className={cn('h-16 w-full', swatch)} />
      <div className="space-y-0.5 p-3 text-sm">
        <p className="font-medium">{name}</p>
        {role ? <p className="text-xs text-muted-foreground">{role}</p> : null}
        {hex ? <p className="font-mono text-xs text-muted-foreground">{hex}</p> : null}
        <p className="font-mono text-xs text-muted-foreground">{token}</p>
      </div>
    </div>
  );
}
