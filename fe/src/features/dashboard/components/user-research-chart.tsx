import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import type { UserDashboard } from '../types/dashboard.types'

const config = {
  completed: { label: 'Hoàn tất', color: 'var(--chart-3)' },
  failed: { label: 'Bị lỗi', color: 'var(--destructive)' },
} satisfies ChartConfig

export function UserResearchChart({ data }: { data: UserDashboard['trend'] }) {
  const visibleData = data.filter((item) => item.completed > 0 || item.failed > 0).slice(-12)

  if (!visibleData.length) return <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Chưa có kết quả research trong 30 ngày.</div>

  return <ChartContainer config={config} className="h-64 w-full aspect-auto">
    <BarChart accessibilityLayer data={visibleData} margin={{ left: 0, right: 8, top: 20 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} tickFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload?.date ? new Date(`${payload[0].payload.date}T00:00:00`).toLocaleDateString('vi-VN') : ''} />} />
      <Bar dataKey="completed" fill="var(--color-completed)" radius={[5, 5, 0, 0]} maxBarSize={34}><LabelList dataKey="completed" position="top" className="fill-foreground font-medium" fontSize={11} formatter={(value) => Number(value) > 0 ? value : ''} /></Bar>
      <Bar dataKey="failed" fill="var(--color-failed)" radius={[5, 5, 0, 0]} maxBarSize={34}><LabelList dataKey="failed" position="top" className="fill-foreground font-medium" fontSize={11} formatter={(value) => Number(value) > 0 ? value : ''} /></Bar>
      <ChartLegend content={<ChartLegendContent />} />
    </BarChart>
  </ChartContainer>
}
