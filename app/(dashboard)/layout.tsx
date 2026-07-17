import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { WatermarkClient } from "@/components/shared/WatermarkClient";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian">
      <DashboardSidebar />
      <WatermarkClient />
      <main className="md:ml-64 pt-24 pb-20 md:pt-24 md:pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}