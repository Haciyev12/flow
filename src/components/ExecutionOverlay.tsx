import {
  CheckCircle2, XCircle, Loader2, Circle, MinusCircle,
  Square, X, Play,
  AppWindow, FolderOpen, FileText, Folder, Globe,
} from "lucide-react";
import type { WorkspaceExecutionState, ExecutionItemStatus, ItemType } from "../types";
import type { LauncherItem } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexBg(color: string, opacity = "22") { return color + opacity; }

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  app:     <AppWindow  size={12} strokeWidth={1.8} />,
  project: <FolderOpen size={12} strokeWidth={1.8} />,
  file:    <FileText   size={12} strokeWidth={1.8} />,
  folder:  <Folder     size={12} strokeWidth={1.8} />,
  website: <Globe      size={12} strokeWidth={1.8} />,
};

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ExecutionItemStatus }) {
  switch (status) {
    case "pending":
      return <Circle size={14} strokeWidth={1.5} className="text-dim/50" />;
    case "running":
      return <Loader2 size={14} strokeWidth={2} className="text-accent animate-spin" />;
    case "success":
      return <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-400" />;
    case "failed":
      return <XCircle size={14} strokeWidth={2} className="text-red-400" />;
    case "skipped":
      return <MinusCircle size={14} strokeWidth={1.5} className="text-dim" />;
  }
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ items }: { items: WorkspaceExecutionState["items"] }) {
  const done = items.filter(
    (i) => i.status === "success" || i.status === "failed" || i.status === "skipped"
  ).length;
  const pct = items.length === 0 ? 0 : (done / items.length) * 100;

  return (
    <div className="h-1 w-full bg-elevated rounded-full overflow-hidden">
      <div
        className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Confirm prompt ────────────────────────────────────────────────────────────

function ConfirmPrompt({
  item,
  onYes,
  onSkip,
}: {
  item: LauncherItem;
  onYes: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="bg-elevated border border-line rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: hexBg(item.color), color: item.color }}
        >
          {TYPE_ICONS[item.type]}
        </div>
        <div>
          <p className="text-[12px] font-medium text-hi">{item.name}</p>
          <p className="text-[11px] text-dim">Confirm before launching?</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onYes}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Play size={11} strokeWidth={2.5} />
          Launch
        </button>
        <button
          onClick={onSkip}
          className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-line text-[12px] text-lo hover:text-hi hover:border-elevated transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  execItem: WorkspaceExecutionState["items"][0];
  resolvedItem: LauncherItem | null;
  isActive: boolean;
}

function ItemRow({ execItem, resolvedItem, isActive }: ItemRowProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150
        ${isActive ? "bg-elevated" : ""}
      `}
    >
      <StatusIcon status={execItem.status} />

      {resolvedItem ? (
        <>
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: hexBg(resolvedItem.color), color: resolvedItem.color }}
          >
            {TYPE_ICONS[resolvedItem.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-hi truncate">{resolvedItem.name}</p>
            {execItem.status === "failed" && execItem.error && (
              <p className="text-[11px] text-red-400 truncate mt-0.5">{execItem.error}</p>
            )}
            {execItem.status === "skipped" && execItem.error && (
              <p className="text-[11px] text-dim truncate mt-0.5">{execItem.error}</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="w-5 h-5 rounded-md bg-elevated flex items-center justify-center shrink-0" />
          <p className="flex-1 text-[12px] text-dim italic truncate">Deleted item</p>
        </>
      )}
    </div>
  );
}

// ── Completion banner ─────────────────────────────────────────────────────────

function CompletionBanner({
  status,
  items,
}: {
  status: WorkspaceExecutionState["status"];
  items: WorkspaceExecutionState["items"];
}) {
  const succeeded = items.filter((i) => i.status === "success").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const skipped = items.filter((i) => i.status === "skipped").length;

  if (status === "completed") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-emerald-300">Workspace started</p>
          <p className="text-[11px] text-dim mt-0.5">
            {succeeded} launched{skipped > 0 ? `, ${skipped} skipped` : ""}
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
        <XCircle size={16} className="text-red-400 shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-red-300">Finished with errors</p>
          <p className="text-[11px] text-dim mt-0.5">
            {succeeded} launched, {failed} failed{skipped > 0 ? `, ${skipped} skipped` : ""}
          </p>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-elevated border border-line rounded-xl">
        <MinusCircle size={16} className="text-dim shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-lo">Stopped</p>
          <p className="text-[11px] text-dim mt-0.5">
            {succeeded} launched before stopping
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ── Main overlay ──────────────────────────────────────────────────────────────

interface ExecutionOverlayProps {
  state: WorkspaceExecutionState;
  resolvedItems: (LauncherItem | null)[];
  onStop: () => void;
  onDismiss: () => void;
  onConfirm: (confirmed: boolean) => void;
}

export function ExecutionOverlay({
  state,
  resolvedItems,
  onStop,
  onDismiss,
  onConfirm,
}: ExecutionOverlayProps) {
  const isActive = state.status === "running" || state.status === "paused_confirm";
  const isDone = !isActive;

  const doneCount = state.items.filter(
    (i) => i.status === "success" || i.status === "failed" || i.status === "skipped"
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[420px] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: hexBg(state.workspaceColor), color: state.workspaceColor }}
            >
              {isActive && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
              {isDone && <CheckCircle2 size={14} strokeWidth={2} />}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-hi">{state.workspaceName}</p>
              <p className="text-[11px] text-dim">
                {isActive
                  ? `${doneCount} of ${state.items.length} items`
                  : `${state.items.length} items`}
              </p>
            </div>
          </div>
          {isDone && (
            <button
              onClick={onDismiss}
              className="w-6 h-6 flex items-center justify-center rounded-md text-dim hover:text-lo hover:bg-hover transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-3">
          <ProgressBar items={state.items} />
        </div>

        {/* Item list */}
        <div className="px-2 py-3 max-h-[320px] overflow-y-auto space-y-0.5">
          {state.items.map((execItem, i) => (
            <ItemRow
              key={execItem.id}
              execItem={execItem}
              resolvedItem={resolvedItems[i] ?? null}
              isActive={i === state.currentIndex}
            />
          ))}
        </div>

        {/* Confirm prompt */}
        {state.status === "paused_confirm" && state.confirmItem && (
          <div className="px-5 pb-4">
            <ConfirmPrompt
              item={state.confirmItem}
              onYes={() => onConfirm(true)}
              onSkip={() => onConfirm(false)}
            />
          </div>
        )}

        {/* Completion banner */}
        {isDone && (
          <div className="px-5 pb-4">
            <CompletionBanner status={state.status} items={state.items} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line">
          {isActive ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-line text-[12px] text-lo hover:text-red-400 hover:border-red-400/30 transition-colors"
            >
              <Square size={11} strokeWidth={2} className="fill-current" />
              Stop
            </button>
          ) : (
            <button
              onClick={onDismiss}
              className="px-4 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
