import { ArrowLeft, Gauge, Tags, TimerReset, Users } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { DashboardTopbar } from '@/shared/components/layouts/DashboardTopbar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from '@/shared/components/ui/sidebar'

const navigation = [
  { to: '/admin', label: 'Tổng quan', icon: Gauge, end: true },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/crawls', label: 'Thu thập việc làm', icon: TimerReset },
  { to: '/admin/pricing', label: 'Bảng giá', icon: Tags },
]

export function AdminLayout() {
  const location = useLocation()
  return <SidebarProvider>
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-background">
      <SidebarHeader className="px-3 py-5 group-data-[collapsible=icon]:px-2">
        <div className="flex h-11 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg"><img src="/logo.png" alt="Seev" className="size-9 object-contain" /></span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-xl font-semibold leading-none tracking-tight text-zinc-800">Quản trị</p><p className="mt-1 text-xs text-muted-foreground">Seev</p></div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-2 group-data-[collapsible=icon]:px-2">
        <SidebarGroup className="gap-2 px-0"><SidebarGroupContent><SidebarMenu className="gap-1">
          {navigation.map((item) => <SidebarMenuItem key={item.to}><SidebarMenuButton
            className="h-10 gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-muted hover:text-zinc-900 data-[active=true]:bg-emerald-500/10 data-[active=true]:text-emerald-700 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:px-0 [&_svg]:size-[18px]"
            isActive={item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
            tooltip={item.label}
            render={<NavLink to={item.to}><item.icon /><span>{item.label}</span></NavLink>}
          /></SidebarMenuItem>)}
        </SidebarMenu></SidebarGroupContent></SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4 group-data-[collapsible=icon]:px-2"><SidebarMenu><SidebarMenuItem><SidebarMenuButton className="h-10 gap-3 rounded-lg px-3 text-zinc-600 hover:bg-muted hover:text-zinc-900" tooltip="Về ứng dụng" render={<NavLink to="/dashboard"><ArrowLeft /><span>Về ứng dụng</span></NavLink>} /></SidebarMenuItem></SidebarMenu></SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset className="min-w-0 overflow-x-clip">
      <DashboardTopbar />
      <div className="flex min-w-0 flex-1 flex-col gap-5 px-[var(--content-pad)] py-[var(--content-pad)] [--content-pad:0.75rem] sm:gap-6 sm:[--content-pad:1.25rem] lg:[--content-pad:1.5rem]"><Outlet /></div>
    </SidebarInset>
  </SidebarProvider>
}
