import { Search } from "lucide-react";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 h-12 bg-app border-b border-line shrink-0">
      <h1 className="text-[13px] font-semibold text-hi">{title}</h1>

      <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-line text-dim text-xs hover:bg-hover hover:text-lo transition-colors duration-100 cursor-default">
        <Search size={11} strokeWidth={1.8} />
        <span>Search or jump to</span>
        <kbd className="ml-1.5 text-[10px] text-dim font-mono">⌘K</kbd>
      </button>
    </header>
  );
}
