import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import type { AdminDashboard } from '../types/admin.types'

const config = {
  researches: { label: 'Phiên nghiên cứu', color: 'var(--chart-4)' },
  users: { label: 'Người dùng mới', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function AdminGrowthChart({ data }: { data: AdminDashboard['trend'] }) {
  return <ChartContainer config={config} className="h-72 w-full aspect-auto">
    <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 8, top: 12 }}>
      <defs><linearGradient id="admin-research" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-researches)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--color-researches)" stopOpacity={0.02} /></linearGradient></defs>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} tickFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} />
      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, payload) => payload[0]?.payload?.date ? new Date(`${payload[0].payload.date}T00:00:00`).toLocaleDateString('vi-VN') : ''} />} />
      <Area dataKey="researches" type="monotone" fill="url(#admin-research)" stroke="var(--color-researches)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-researches)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
      <Area dataKey="users" type="monotone" fill="transparent" stroke="var(--color-users)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-users)', strokeWidth: 0 }} />
      <ChartLegend content={<ChartLegendContent />} />
    </AreaChart>
  </ChartContainer>
}
