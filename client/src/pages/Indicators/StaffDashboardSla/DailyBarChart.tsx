import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  SERIES_COLORS,
  TOOLTIP_CURSOR_FILL,
  type SeriesDef,
} from './chartModel';
import ChartTooltip from './ChartTooltip';
import EmptyChartMessage from './EmptyChartMessage';

type Props = {
  title: string;
  empty: boolean;
  emptyMessage: string;
  rows: Record<string, string | number>[];
  series: SeriesDef[];
  stacked?: boolean;
};

export default function DailyBarChart({
  title,
  empty,
  emptyMessage,
  rows,
  series,
  stacked = true,
}: Props) {
  return (
    <Card>
      <CardHeader className="space-y-0.5 p-3 pb-1.5">
        <CardTitle className="text-sm md:text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[min(14rem,28vh)] p-3 pt-0">
        {empty ? (
          <EmptyChartMessage message={emptyMessage} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <YAxis
                allowDecimals={false}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={TOOLTIP_CURSOR_FILL}
              />
              {series.map((item, index) => {
                const color =
                  item.color ?? SERIES_COLORS[index % SERIES_COLORS.length];
                return (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    name={item.label}
                    stackId={stacked ? 'stack' : undefined}
                    fill={color}
                    radius={
                      index === series.length - 1 ? [3, 3, 0, 0] : undefined
                    }
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
