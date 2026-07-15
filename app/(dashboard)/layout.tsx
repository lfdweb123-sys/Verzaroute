import { DashboardSidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian">
      <DashboardSidebar />
      
      {/* Marge gauche dynamique qui suit l'état collapsed de la sidebar */}
      {/* Note: Si vous ne pouvez pas accéder à l'état isCollapsed ici, 
          utilisez une classe CSS conditionnelle ou déplacez ce layout 
          dans un composant client qui partage l'état */}
      <main className="md:ml-64 pt-16 pb-20 md:pt-0 md:pb-0 px-4 sm:px-6 lg:px-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}