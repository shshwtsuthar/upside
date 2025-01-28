import { Calendar, Home, Inbox, Search, Settings, ArrowLeftRight, ChartScatter, Flag, ScrollText, CircleGauge } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { NavUser } from "./nav-user";

const data = {
  user: {
    name: "Shashwat Suthar",
    email: "shshwtsuthar@gmail.com",
    avatar: "UP_STROKE_LOGO.jpg",
  }
}
// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "#",
    icon: CircleGauge,
  },
  {
    title: "Accounts",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Transactions",
    url: "#",
    icon: ArrowLeftRight,
  },
  {
    title: "Spending Insights",
    url: "#",
    icon: ChartScatter,
  },
  {
    title: "Budgets",
    url: "#",
    icon: Flag,
  },
  {
    title: "Reports",
    url: "#",
    icon: ScrollText,
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <img src="UP_STROKE_LOGO.png" alt="Logo"/>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Upside</span>
                  
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user}/>
      </SidebarFooter>
    </Sidebar>
  )
}
