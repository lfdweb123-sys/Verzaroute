import { DashboardSidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-obsidian">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 pt-16 md:pt-16 pb-20 md:pb-0 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}