import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AppWindow, FolderOpen, FileText, Folder, Globe,
  Layers, Clock, Inbox,
} from "lucide-react";
import { useLauncher } from "../hooks/useLauncher";
import { useWorkspaces } from "../hooks/useWorkspaces";
import type { LauncherItem, Workspace, ItemType } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentEntry {
  id: string;
  kind: string;
  usedAt: string;
}

interface ResolvedEntry extends RecentEntry {
  name: string;
  itemType: ItemType | "workspace";
  color: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ITEM_ICONS: Record<ItemType, React.ReactNode> = {
  app:     <AppWindow  size={13} strokeWidth={1.8} />,
  project: <FolderOpen size={13} strokeWidth={1.8} />,
  file:    <FileText   size={13} strokeWidth={1.8} />,
  folder:  <Folder     size={13} strokeWidth={1.8} />,
  website: <Globe      size={13} strokeWidth={1.8} />,
};

function hexBg(color: string) { return color + "22"; }

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function resolve(
  entry: RecentEntry,
  items: LauncherItem[],
  workspaces: Workspace[],
): ResolvedEntry | null {
  if (entry.kind === "item") {
    const item = items.find((i) => i.id === entry.id);
    if (!item) return null;
    return { ...entry, name: item.name, itemType: item.type, color: item.color };
  }
  if (entry.kind === "workspace") {
    const ws = workspaces.find((w) => w.id === entry.id);
    if (!ws) return null;
    return { ...entry, name: ws.name, itemType: "workspace", color: ws.color };
  }
  return null;
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ActivityRow({ entry }: { entry: ResolvedEntry }) {
  const icon = entry.itemType === "workspace"
    ? <Layers size={13} strokeWidth={1.8} />
    : ITEM_ICONS[entry.itemType as ItemType];

  const verb = entry.itemType === "workspace" ? "Started" : "Opened";

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-hover transition-colors duration-100">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: hexBg(entry.color), color: entry.color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-dim">{verb}</span>
          <span className="text-[13px] font-medium text-hi truncate">{entry.name}</span>
        </div>
        <span className="text-[10px] px-1.5 py-[1px] rounded bg-elevated text-dim">
          {entry.itemType}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 text-dim">
        <Clock size={11} strokeWidth={1.5} />
        <span className="text-[11px]">{formatTime(entry.usedAt)}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Activity() {
  const { items } = useLauncher();
  const { workspaces } = useWorkspaces();
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<RecentEntry[]>("load_recents")
      .then(setRecents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const resolved = recents
      .map((r) => resolve(r, items, workspaces))
      .filter((r): r is ResolvedEntry => !!r);

    const map = new Map<string, ResolvedEntry[]>();
    for (const entry of resolved) {
      const label = dayLabel(entry.usedAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(entry);
    }
    return Array.from(map.entries());
  }, [recents, items, workspaces]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-dim">Loading…</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-card border border-line flex items-center justify-center">
          <Inbox size={20} strokeWidth={1.5} className="text-dim" />
        </div>
        <p className="text-[13px] font-medium text-lo">No activity yet</p>
        <p className="text-[12px] text-dim text-center max-w-xs">
          Items and workspaces you open from the palette or Library will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {groups.map(([label, entries]) => (
          <section key={label}>
            <p className="text-[11px] font-semibold text-dim uppercase tracking-widest mb-2">
              {label}
            </p>
            <div className="bg-card border border-line rounded-xl overflow-hidden">
              {entries.map((entry, i) => (
                <div key={entry.id + entry.usedAt} className={i < entries.length - 1 ? "border-b border-line" : ""}>
                  <ActivityRow entry={entry} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
