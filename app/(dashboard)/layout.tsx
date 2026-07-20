"use client";

import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { WatermarkClient } from "@/components/shared/WatermarkClient";
import { SidebarCollapseProvider, useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils/cn";

function DashboardMain({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebarCollapse();

  return (
    <main
      className={cn(
        "pt-24 pb-20 md:pt-24 md:pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300",
        isCollapsed ? "md:ml-20" : "md:ml-64"
      )}
    >
      {children}
    </main>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarCollapseProvider>
      <div className="min-h-screen bg-obsidian">
        <DashboardSidebar />
        <WatermarkClient />
        <DashboardMain>{children}</DashboardMain>
      </div>
    </SidebarCollapseProvider>
  );
}