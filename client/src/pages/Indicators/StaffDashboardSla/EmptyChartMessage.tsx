type Props = {
  message: string;
};

export default function EmptyChartMessage({ message }: Props) {
  return (
    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}
