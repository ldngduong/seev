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
      <Sidebar collapsible="icon" className="border-r bg-sidebar">
        <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-2">
          <div className="flex h-11 items-center gap-3 rounded-2xl px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl">
              <img
                src="/logo.png"
                alt="Seev"
                className="size-10 object-contain"
              />
            </span>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-lg font-semibold leading-none text-zinc-700">
                Seev
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                CV research workspace
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-2 group-data-[collapsible=icon]:px-2">
          <SidebarGroup className="gap-3 px-0">
            <SidebarGroupLabel className="px-3 text-sm font-medium text-zinc-500 group-data-[collapsible=icon]:sr-only">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      className="h-11 gap-3 rounded-2xl px-3 text-[15px] font-medium text-zinc-700 transition-colors hover:bg-sidebar-accent hover:text-zinc-900 data-[active=true]:bg-sidebar-accent data-[active=true]:text-zinc-900 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:px-0 [&_svg]:size-5 [&_svg]:shrink-0"
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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-[var(--content-pad)] [--content-pad:1rem] sm:[--content-pad:1.25rem] lg:[--content-pad:1.5rem]">
          <SidebarTrigger className="size-9 rounded-xl text-zinc-700" />
        </header>
        <div className="flex flex-1 flex-col gap-6 px-[var(--content-pad)] py-[var(--content-pad)] [--content-pad:1rem] sm:[--content-pad:1.25rem] lg:[--content-pad:1.5rem]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
