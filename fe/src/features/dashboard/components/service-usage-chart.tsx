import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'

const config = { uses: { label: 'Lượt sử dụng', color: 'var(--chart-3)' } } satisfies ChartConfig

export function ServiceUsageChart({ data }: { data: Array<{ service_name: string; uses: number }> }) {
  if (!data.length) return <div className="grid min-h-56 place-items-center text-center text-sm text-muted-foreground">Chưa có dữ liệu sử dụng trong 30 ngày.</div>
  return <ChartContainer config={config} className="h-56 w-full aspect-auto">
    <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 30 }}>
      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
      <YAxis dataKey="service_name" type="category" tickLine={false} axisLine={false} width={108} tick={{ fontSize: 11 }} />
      <XAxis dataKey="uses" type="number" hide />
      <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltipContent hideLabel />} />
      <Bar dataKey="uses" fill="var(--color-uses)" radius={[0, 6, 6, 0]} maxBarSize={34}><LabelList dataKey="uses" position="right" className="fill-foreground font-medium" fontSize={11} /></Bar>
    </BarChart>
  </ChartContainer>
}
