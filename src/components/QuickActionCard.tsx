import type { QuickAction } from "../types";

interface QuickActionCardProps {
  action: QuickAction;
}

export function QuickActionCard({ action }: QuickActionCardProps) {
  const Icon = action.icon;
  return (
    <div className="flex-1 bg-card border border-line rounded-xl p-4 hover:bg-hover hover:border-elevated transition-all duration-150 cursor-default group">
      <div className="flex items-start justify-between mb-3.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: action.iconBg }}
        >
          <Icon size={14} strokeWidth={2} style={{ color: action.iconColor }} />
        </div>
        <kbd className="text-[10px] text-dim font-mono">{action.shortcut}</kbd>
      </div>
      <p className="text-[13px] font-medium text-hi mb-1">{action.title}</p>
      <p className="text-[12px] text-lo">{action.description}</p>
    </div>
  );
}
