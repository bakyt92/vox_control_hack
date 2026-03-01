import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, BarChart3, Database, Zap, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Knowledge",
    href: "/knowledge",
    icon: Database,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const isDemoPage = location.pathname.startsWith("/demo/");

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/30 bg-card"
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "2rem",
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="border-b border-border/30 p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <Zap className="h-5 w-5 text-primary shrink-0" />
          <span className="font-bold text-lg text-foreground whitespace-nowrap">
            VoxControl<span className="text-primary">.ai</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive && !isDemoPage}
                      tooltip={item.title}
                      size="default"
                    >
                      <NavLink to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
