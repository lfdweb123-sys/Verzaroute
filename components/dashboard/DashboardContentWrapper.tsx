"use client";

import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils/cn";

export function DashboardContentWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebarCollapse();

  return (
    <div className={cn("flex-1 min-w-0 pt-16 transition-all duration-300", isCollapsed ? "md:ml-20" : "md:ml-64")}>
      {children}
    </div>
  );
}