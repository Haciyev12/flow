import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus, Play, Layers,
  AppWindow, FolderOpen, FileText, Folder, Globe,
  Code2, BookOpen, Zap, Target, Briefcase, Star,
  Coffee, Music, Heart, Terminal,
} from "lucide-react";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { useLauncher } from "../hooks/useLauncher";
import { useWorkspaceExecution } from "../hooks/useWorkspaceExecution";
import { ExecutionOverlay } from "../components/ExecutionOverlay";
import type { Workspace, WorkspaceIconName, LauncherItem, ItemType } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function currentDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

function hexBg(color: string) { return color + "22"; }

// ── Icon registries ───────────────────────────────────────────────────────────

const WS_ICONS: Record<WorkspaceIconName, React.ReactNode> = {
  "code2":     <Code2     size={16} strokeWidth={1.8} />,
  "book-open": <BookOpen  size={16} strokeWidth={1.8} />,
  "zap":       <Zap       size={16} strokeWidth={1.8} />,
  "globe":     <Globe     size={16} strokeWidth={1.8} />,
  "layers":    <Layers    size={16} strokeWidth={1.8} />,
  "briefcase": <Briefcase size={16} strokeWidth={1.8} />,
  "star":      <Star      size={16} strokeWidth={1.8} />,
  "coffee":    <Coffee    size={16} strokeWidth={1.8} />,
  "music":     <Music     size={16} strokeWidth={1.8} />,
  "target":    <Target    size={16} strokeWidth={1.8} />,
  "heart":     <Heart     size={16} strokeWidth={1.8} />,
  "terminal":  <Terminal  size={16} strokeWidth={1.8} />,
};

const ITEM_ICONS: Record<ItemType, React.ReactNode> = {
  app:     <AppWindow  size={13} strokeWidth={1.8} />,
  project: <FolderOpen size={13} strokeWidth={1.8} />,
  file:    <FileText   size={13} strokeWidth={1.8} />,
  folder:  <Folder     size={13} strokeWidth={1.8} />,
  website: <Globe      size={13} strokeWidth={1.8} />,
};

// ── Workspace quick-action card ───────────────────────────────────────────────

interface WorkspaceCardProps {
  workspace: Workspace;
  onStart: () => void;
  isRunning: boolean;
}

function WorkspaceCard({ workspace, onStart, isRunning }: WorkspaceCardProps) {
  return (
    <div
      className="flex-1 bg-card border border-line rounded-xl p-4 hover:bg-hover hover:border-elevated transition-all duration-150 cursor-default group min-w-0"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: hexBg(workspace.color), color: workspace.color }}
        >
          {WS_ICONS[workspace.icon]}
        </div>
        <button
          onClick={onStart}
          disabled={isRunning}
          title="Start workspace"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-white disabled:opacity-40"
          style={{ background: workspace.color }}
        >
          <Play size={9} strokeWidth={2.5} className="fill-current" />
          Start
        </button>
      </div>
      <p className="text-[13px] font-medium text-hi mb-0.5 truncate">{workspace.name}</p>
      <p className="text-[12px] text-lo truncate">
        {workspace.description || `${workspace.itemIds.length} item${workspace.itemIds.length !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}

// ── Recent row ────────────────────────────────────────────────────────────────

interface RecentEntry { id: string; kind: string; usedAt: string; }

interface RecentRowProps {
  entry: RecentEntry;
  items: LauncherItem[];
  workspaces: Workspace[];
}

function RecentRow({ entry, items, workspaces }: RecentRowProps) {
  if (entry.kind === "item") {
    const item = items.find((i) => i.id === entry.id);
    if (!item) return null;
    return (
      <div className="flex items-center gap-3 py-2.5 group">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: hexBg(item.color), color: item.color }}
        >
          {ITEM_ICONS[item.type]}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-hi">{item.name}</span>
          <span className="text-[10px] text-dim ml-2">{item.type}</span>
        </div>
        <span className="text-[11px] text-dim shrink-0">{timeAgo(entry.usedAt)}</span>
      </div>
    );
  }

  if (entry.kind === "workspace") {
    const ws = workspaces.find((w) => w.id === entry.id);
    if (!ws) return null;
    return (
      <div className="flex items-center gap-3 py-2.5 group">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: hexBg(ws.color), color: ws.color }}
        >
          <Layers size={12} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-hi">{ws.name}</span>
          <span className="text-[10px] text-dim ml-2">workspace</span>
        </div>
        <span className="text-[11px] text-dim shrink-0">{timeAgo(entry.usedAt)}</span>
      </div>
    );
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function Overview() {
  const { workspaces } = useWorkspaces();
  const { items } = useLauncher();
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const { state: execState, start, stop, dismiss, respondConfirm } = useWorkspaceExecution();

  useEffect(() => {
    invoke<RecentEntry[]>("load_recents").then(setRecents).catch(() => {});
  }, []);

  const displayedWorkspaces = workspaces.slice(0, 3);
  const displayedRecents = recents.slice(0, 6);

  // For the ExecutionOverlay we need resolved items in workspace order.
  const execWorkspace = execState
    ? workspaces.find((w) => w.id === execState.workspaceId)
    : null;
  const execResolvedItems = execWorkspace
    ? execWorkspace.itemIds.map((id) => items.find((i) => i.id === id) ?? null)
    : [];

  function handleStartWorkspace(ws: Workspace) {
    const resolved = ws.itemIds.map((id) => items.find((i) => i.id === id) ?? null);
    start(ws, resolved);
  }

  const isExecuting = execState?.status === "running" || execState?.status === "paused_confirm";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-9">

        {/* Welcome */}
        <div>
          <h2 className="text-[22px] font-semibold text-hi tracking-tight leading-tight">
            {greeting()}, Amal
          </h2>
          <p className="text-[13px] text-lo mt-1">{currentDate()}</p>
          <p className="text-[12px] text-dim mt-0.5">
            {workspaces.length > 0
              ? "Your workspace is ready."
              : "Add items to your Library and create a workspace to get started."}
          </p>
        </div>

        {/* Workspaces / Quick Actions */}
        <section>
          <p className="text-[11px] font-semibold text-dim uppercase tracking-widest mb-3">
            Quick Actions
          </p>
          {workspaces.length === 0 ? (
            <div className="bg-card border border-line rounded-xl flex items-center gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-lg bg-hover flex items-center justify-center shrink-0">
                <Layers size={16} strokeWidth={1.5} className="text-dim" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-lo">No workspaces yet</p>
                <p className="text-[12px] text-dim mt-0.5">
                  Create a workspace to launch groups of apps in one click.
                </p>
              </div>
              <div className="shrink-0">
                <Plus size={14} strokeWidth={2} className="text-dim" />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {displayedWorkspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  onStart={() => handleStartWorkspace(ws)}
                  isRunning={isExecuting}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recently Used */}
        {displayedRecents.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-dim uppercase tracking-widest mb-1">
              Recently Used
            </p>
            <div className="bg-card border border-line rounded-xl px-4 divide-y divide-line">
              {displayedRecents.map((entry) => (
                <RecentRow
                  key={entry.id + entry.usedAt}
                  entry={entry}
                  items={items}
                  workspaces={workspaces}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state when no recents */}
        {displayedRecents.length === 0 && workspaces.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-dim uppercase tracking-widest mb-3">
              Recently Used
            </p>
            <p className="text-[12px] text-dim">
              Items and workspaces you open will appear here.
            </p>
          </section>
        )}

      </div>

      {/* Execution overlay */}
      {execState && (
        <ExecutionOverlay
          state={execState}
          resolvedItems={execResolvedItems}
          onStop={stop}
          onDismiss={dismiss}
          onConfirm={respondConfirm}
        />
      )}
    </div>
  );
}
