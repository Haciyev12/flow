import type { ActivityEntry } from "../types";

interface ActivityItemProps {
  entry: ActivityEntry;
  isLast: boolean;
}

export function ActivityItem({ entry, isLast }: ActivityItemProps) {
  const Icon = entry.icon;
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-6 h-6 rounded-md bg-card border border-line flex items-center justify-center">
          <Icon size={11} strokeWidth={2} className="text-lo" />
        </div>
        {!isLast && (
          <div className="w-px bg-line mt-1.5" style={{ height: "24px" }} />
        )}
      </div>
      <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
        <p className="text-[13px] text-hi leading-snug">
          {entry.action}{" "}
          <span className="text-lo">{entry.target}</span>
        </p>
        <p className="text-[11px] text-dim mt-0.5">{entry.time}</p>
      </div>
    </div>
  );
}
