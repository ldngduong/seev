import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import type { AdminDashboard } from '../types/admin.types'

const config = { credits: { label: 'Credit tiêu thụ', color: 'var(--chart-3)' } } satisfies ChartConfig

export function AdminCreditChart({ data }: { data: AdminDashboard['trend'] }) {
  return <ChartContainer config={config} className="min-h-72 w-full aspect-auto">
    <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 12 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={34} tickFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} />
      <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload?.date ? new Date(`${payload[0].payload.date}T00:00:00`).toLocaleDateString('vi-VN') : ''} />} />
      <Bar dataKey="credits" fill="var(--color-credits)" radius={[5, 5, 0, 0]} maxBarSize={22} />
    </BarChart>
  </ChartContainer>
}
