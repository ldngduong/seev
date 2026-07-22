import {
  BriefcaseBusiness,
  FileText,
  FolderOpen,
  LayoutDashboard,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
const navItems = [
  {
    title: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Items',
    to: '/items',
    icon: FolderOpen,
  },
  {
    title: 'CV của tôi',
    to: '/my-cvs',
    icon: FileText,
  },
  {
    title: 'Research',
    to: '/research-cv',
    icon: BriefcaseBusiness,
  },
]

export function AuthLayout() {
  const location = useLocation()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-10 items-center gap-2 rounded-xl px-2">
            <div className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
              S
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Seev</p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                CV research workspace
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
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
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-[var(--content-pad)] [--content-pad:1rem] sm:[--content-pad:1.25rem] lg:[--content-pad:1.5rem]">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 flex-col gap-6 px-[var(--content-pad)] py-[var(--content-pad)] [--content-pad:1rem] sm:[--content-pad:1.25rem] lg:[--content-pad:1.5rem]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
