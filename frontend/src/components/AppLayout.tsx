import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger, SidebarRail } from "./ui/sidebar";

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 px-3 border-b border-border/30 bg-background">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
          <div className="flex-1" />
        </header>
        {children || <Outlet />}
        <SidebarRail />
      </SidebarInset>
    </SidebarProvider>
  );
}
