export function AdminTopBar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-6 md:px-8 h-16 border-b border-white/10 bg-obsidian/80 backdrop-blur-md sticky top-0 z-40">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
    </div>
  );
}
