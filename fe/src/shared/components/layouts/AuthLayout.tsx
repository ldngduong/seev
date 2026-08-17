import {
  Bookmark,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  Newspaper,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

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
import { DashboardTopbar } from './DashboardTopbar'
const navItems = [
  {
    title: 'Tổng quan',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'CV của tôi',
    to: '/my-cvs',
    icon: FileText,
  },
  {
    title: 'Việc làm',
    to: '/jobs',
    icon: Newspaper,
  },
  {
    title: 'Việc làm đã lưu',
    to: '/saved-jobs',
    icon: Bookmark,
  },
  {
    title: 'Nghiên cứu',
    to: '/research-history',
    icon: BriefcaseBusiness,
  },
]

export function AuthLayout() {
  const location = useLocation()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/60 bg-background">
        <SidebarHeader className="px-3 py-5 group-data-[collapsible=icon]:px-2">
          <div className="flex h-11 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg">
              <img
                src="/logo.png"
                alt="Seev"
                className="size-9 object-contain"
              />
            </span>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xl font-semibold leading-none tracking-tight text-zinc-800">
                Seev
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-2 group-data-[collapsible=icon]:px-2">
          <SidebarGroup className="gap-2 px-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      className="h-10 gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-muted hover:text-zinc-900 data-[active=true]:bg-emerald-500/10 data-[active=true]:text-emerald-700 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:px-0 [&_svg]:size-[18px] [&_svg]:shrink-0"
                      isActive={
                        location.pathname === item.to ||
                        location.pathname.startsWith(`${item.to}/`)
                      }
                      tooltip={item.title}
                      render={
                        <NavLink to={item.to}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0 overflow-x-clip">
        <DashboardTopbar />
        <div className="flex min-w-0 flex-1 flex-col gap-5 px-[var(--content-pad)] py-[var(--content-pad)] [--content-pad:0.75rem] sm:gap-6 sm:[--content-pad:1.25rem] lg:[--content-pad:1.5rem]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
