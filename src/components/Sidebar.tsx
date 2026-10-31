import { navItems, settingsNavItem } from "../data/sampleData";
import type { NavItem } from "../types";

interface SidebarProps {
  activePage: string;
  onNavigate: (pageId: string) => void;
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, onClick }: NavButtonProps) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md text-[13px] font-medium
        transition-colors duration-100 cursor-default select-none
        ${isActive ? "bg-hover text-hi" : "text-lo hover:bg-card hover:text-hi"}
      `}
    >
      <Icon
        size={14}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={isActive ? "text-accent" : "text-dim"}
      />
      {item.label}
    </button>
  );
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 h-full bg-sidebar border-r border-line shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-12 shrink-0">
        <div className="w-6 h-6 rounded-[6px] bg-accent flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 9.5L6 2.5L10.5 9.5H1.5Z" fill="white" fillOpacity="0.95" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-hi tracking-tight">Flow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-[2px] overflow-y-auto">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* Settings */}
      <div className="px-2 pb-3 pt-2 border-t border-line shrink-0">
        <NavButton
          item={settingsNavItem}
          isActive={activePage === "settings"}
          onClick={() => onNavigate("settings")}
        />
      </div>
    </aside>
  );
}
