type TicketDetailHeaderProps = {
  number: number;
  subject: string;
};

export default function TicketDetailHeader({ number, subject }: TicketDetailHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
      <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-foreground">
        <span className="font-medium tabular-nums text-muted-foreground">#{number}</span>
        <span className="mx-2 font-normal text-muted-foreground/70">/</span>
        {subject}
      </h2>
    </div>
  );
}
