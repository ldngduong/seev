import { CircleDollarSign } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { AdminPage } from '../components/admin-page'
import { useAdminPricing } from '../hooks/use-admin-pricing'
import type { ServiceProduct } from '../types/admin.types'

function PriceRow({ service, update, pending }: { service: ServiceProduct; update: (price: number) => void; pending: boolean }) {
  const [price, setPrice] = useState(service.price_credits)
  return <article className="grid gap-4 rounded-2xl border border-border/60 bg-card p-5 md:grid-cols-[auto_minmax(0,1fr)_180px_auto] md:items-center"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CircleDollarSign className="size-5" /></span><div><h2 className="font-semibold text-zinc-800">{service.name}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{service.description}</p></div><label><span className="mb-1.5 block text-xs text-muted-foreground">Giá mỗi lượt</span><div className="relative"><Input type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} className="pr-14" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">credit</span></div></label><Button disabled={pending || price === '' || Number(price) < 0} onClick={() => update(Number(price))}>Lưu thay đổi</Button></article>
}

export function AdminPricingPage() {
  const state = useAdminPricing()
  return <AdminPage title="Bảng giá" description="Thiết lập số credit cần dùng cho từng dịch vụ."><section className="grid gap-3">{state.services.map((service) => <PriceRow key={service.id} service={service} pending={state.isUpdating} update={(price) => state.updatePrice({ id: service.id, price })} />)}</section></AdminPage>
}
