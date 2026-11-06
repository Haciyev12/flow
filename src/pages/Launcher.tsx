import { useState, useMemo, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus, Search, AppWindow, FolderOpen, FileText, Folder,
  Globe, Code2, Terminal, Pencil, Trash2, ExternalLink,
  Star, Upload, Download, CheckCircle2,
} from "lucide-react";
import { useLauncher } from "../hooks/useLauncher";
import { LauncherModal } from "../components/LauncherModal";
import type { LauncherItem, ItemType } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ItemType, string> = {
  app: "App", project: "Project", file: "File", folder: "Folder", website: "Website",
};

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  app:     <AppWindow  size={14} strokeWidth={1.8} />,
  project: <FolderOpen size={14} strokeWidth={1.8} />,
  file:    <FileText   size={14} strokeWidth={1.8} />,
  folder:  <Folder     size={14} strokeWidth={1.8} />,
  website: <Globe      size={14} strokeWidth={1.8} />,
};

type FilterValue = "all" | "favorites" | "recent" | ItemType;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "favorites", label: "Favorites" },
  { value: "recent",    label: "Recent" },
  { value: "app",       label: "Apps" },
  { value: "project",   label: "Projects" },
  { value: "file",      label: "Files" },
  { value: "folder",    label: "Folders" },
  { value: "website",   label: "Websites" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayTarget(item: LauncherItem): string {
  if (item.type === "website") return item.target;
  const match = item.target.match(/^\/Users\/[^/]+(\/.*)?$/);
  if (match) return "~" + (match[1] ?? "");
  return item.target;
}

function hexBg(color: string): string { return color + "22"; }

// ── Inline notification ───────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-line rounded-xl shadow-lg text-[12px] text-lo">
      <CheckCircle2 size={14} className="text-accent-green shrink-0" />
      {message}
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}

function ActionButton({ icon, label, onClick, danger, active }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium
        transition-colors duration-100 cursor-default whitespace-nowrap
        ${danger  ? "text-dim hover:text-red-400 hover:bg-red-400/10" :
          active  ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10" :
                    "text-dim hover:text-lo hover:bg-hover"}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: LauncherItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

function ItemRow({ item, onEdit, onDelete, onToggleFavorite }: ItemRowProps) {
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(command: string, args: Record<string, string>) {
    setActionError(null);
    try {
      await invoke(command, args);
    } catch (e) {
      const msg = String(e);
      setActionError(msg);
      setTimeout(() => setActionError(null), 5000);
    }
  }

  function primaryAction() {
    if (item.type === "website") run("open_item_url", { url: item.target });
    else run("open_item_path", { path: item.target });
  }

  const primaryLabel =
    item.type === "folder" ? "Finder" :
    item.type === "website" ? "Open" :
    item.type === "app" ? "Launch" : "Open";

  const primaryIcon = item.type === "website" || item.type === "app"
    ? <ExternalLink size={13} strokeWidth={1.8} />
    : item.type === "folder"
      ? <Folder size={13} strokeWidth={1.8} />
      : <ExternalLink size={13} strokeWidth={1.8} />;

  return (
    <div className="group flex items-center gap-3 px-5 py-3.5 hover:bg-hover transition-colors duration-100">
      {/* Type icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: hexBg(item.color), color: item.color }}
      >
        {TYPE_ICONS[item.type]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-hi">{item.name}</span>
          <span className="text-[10px] px-1.5 py-[1px] rounded bg-elevated text-dim font-medium">
            {TYPE_LABELS[item.type]}
          </span>
          {item.type === "project" && item.projectCategory && (
            <span className="text-[10px] px-1.5 py-[1px] rounded bg-elevated text-dim">
              {item.projectCategory}
            </span>
          )}
          {item.favorite && (
            <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
          )}
        </div>
        {item.description && (
          <p className="text-[12px] text-lo truncate mt-0.5">{item.description}</p>
        )}
        <p className="text-[11px] text-dim font-mono truncate mt-0.5">
          {displayTarget(item)}
        </p>
        {actionError && (
          <p className="text-[11px] text-red-400 mt-1 leading-snug">{actionError}</p>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
        <ActionButton icon={primaryIcon} label={primaryLabel} onClick={primaryAction} />

        {item.type === "project" && (
          <>
            <ActionButton
              icon={<Code2 size={13} strokeWidth={1.8} />}
              label="VS Code"
              onClick={() => run("open_in_vscode", { path: item.target })}
            />
            <ActionButton
              icon={<Terminal size={13} strokeWidth={1.8} />}
              label="Terminal"
              onClick={() => run("open_in_terminal", { path: item.target })}
            />
          </>
        )}

        <div className="w-px h-4 bg-line mx-1 shrink-0" />

        <ActionButton
          icon={<Star size={12} strokeWidth={1.8} className={item.favorite ? "fill-current" : ""} />}
          label={item.favorite ? "Unfavorite" : "Favorite"}
          onClick={onToggleFavorite}
          active={item.favorite}
        />
        <ActionButton
          icon={<Pencil size={12} strokeWidth={1.8} />}
          label="Edit"
          onClick={onEdit}
        />
        <ActionButton
          icon={<Trash2 size={12} strokeWidth={1.8} />}
          label="Delete"
          onClick={onDelete}
          danger
        />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filtered, filterLabel, onAdd }: {
  filtered: boolean;
  filterLabel?: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20">
      <div className="w-12 h-12 rounded-xl bg-card border border-line flex items-center justify-center mb-4">
        {filtered
          ? <Star size={20} strokeWidth={1.5} className="text-dim" />
          : <FolderOpen size={20} strokeWidth={1.5} className="text-dim" />}
      </div>
      {filtered ? (
        <>
          <p className="text-[13px] font-medium text-lo">
            No {filterLabel?.toLowerCase() ?? "matching"} items
          </p>
          <p className="text-[12px] text-dim mt-1">
            {filterLabel === "Favorites"
              ? "Star items to add them here."
              : filterLabel === "Recent"
                ? "Items you open from the palette appear here."
                : "Try a different search or filter."}
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] font-medium text-lo">Nothing in your Library yet</p>
          <p className="text-[12px] text-dim mt-1">Add apps, files, projects, or websites.</p>
          <button
            onClick={onAdd}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} strokeWidth={2} />
            Add Item
          </button>
        </>
      )}
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function ConfirmDelete({ item, onConfirm, onCancel }: {
  item: LauncherItem; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[360px] p-6 shadow-2xl">
        <h2 className="text-[14px] font-semibold text-hi mb-2">Remove Item</h2>
        <p className="text-[13px] text-lo leading-relaxed">
          Remove <span className="text-hi font-medium">{item.name}</span> from Flow?
          This does not delete any files.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] text-lo hover:text-hi hover:bg-hover transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-[13px] font-medium bg-red-500/90 text-white hover:bg-red-500 transition-colors">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Import modal ──────────────────────────────────────────────────────────────

function ImportModal({ onDone, onCancel }: {
  onDone: (msg: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    try {
      const content = await file.text();
      const result = await invoke<{ itemsAdded: number; workspacesAdded: number }>(
        "import_config",
        { content, merge: mode === "merge" }
      );
      onDone(
        `Imported ${result.itemsAdded} item${result.itemsAdded !== 1 ? "s" : ""} ` +
        `and ${result.workspacesAdded} workspace${result.workspacesAdded !== 1 ? "s" : ""}. ` +
        `Reloading…`
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setStatus("error");
      setErrorMsg(String(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[400px] p-6 shadow-2xl">
        <h2 className="text-[14px] font-semibold text-hi mb-1">Import Library</h2>
        <p className="text-[12px] text-lo mb-5">
          Choose a Flow backup JSON file to restore items and workspaces.
        </p>

        {/* Mode */}
        <div className="flex gap-2 mb-5">
          {(["merge", "replace"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                mode === m
                  ? "bg-accent/10 border-accent text-accent"
                  : "bg-hover border-line text-lo hover:text-hi"
              }`}
            >
              {m === "merge" ? "Merge (keep existing)" : "Replace (overwrite all)"}
            </button>
          ))}
        </div>

        {status === "error" && (
          <p className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] text-lo hover:text-hi hover:bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={status === "loading"}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Upload size={13} strokeWidth={2} />
            {status === "loading" ? "Importing…" : "Choose File"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}

// ── Launcher page ─────────────────────────────────────────────────────────────

type Modal =
  | { type: "add" }
  | { type: "edit"; item: LauncherItem }
  | { type: "delete"; item: LauncherItem }
  | { type: "import" }
  | null;

interface RecentEntry { id: string; kind: string; usedAt: string; }

export function Launcher() {
  const { items, loading, error, addItem, updateItem, deleteItem, toggleFavorite } =
    useLauncher();
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<FilterValue>("all");
  const [modal, setModal]     = useState<Modal>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [toast, setToast]     = useState<string | null>(null);

  // Load recents for the "Recent" filter
  useEffect(() => {
    invoke<RecentEntry[]>("load_recents")
      .then((r) => setRecentIds(r.filter((e) => e.kind === "item").map((e) => e.id)))
      .catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: items.length,
      favorites: items.filter((i) => i.favorite).length,
      recent: recentIds.filter((id) => items.some((i) => i.id === id)).length,
    };
    for (const item of items) c[item.type] = (c[item.type] ?? 0) + 1;
    return c;
  }, [items, recentIds]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    let base: LauncherItem[];
    if (filter === "favorites") {
      base = items.filter((i) => i.favorite);
    } else if (filter === "recent") {
      // Preserve recents order
      const itemMap = new Map(items.map((i) => [i.id, i]));
      base = recentIds
        .map((id) => itemMap.get(id))
        .filter((i): i is LauncherItem => !!i);
    } else if (filter === "all") {
      base = items;
    } else {
      base = items.filter((i) => i.type === filter);
    }

    if (!q) return base;
    return base.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.target.toLowerCase().includes(q)
    );
  }, [items, recentIds, search, filter]);

  async function handleExport() {
    try {
      const json = await invoke<string>("export_config");
      const data = JSON.parse(json);
      data.exportedAt = new Date().toISOString();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("Library exported.");
    } catch (e) {
      setToast(`Export failed: ${String(e)}`);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-dim">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-red-400">{error}</p>
      </div>
    );
  }

  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-line shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-card border border-line rounded-lg px-3 py-2">
          <Search size={13} strokeWidth={1.8} className="text-dim shrink-0" />
          <input
            type="text"
            placeholder="Search apps, files, websites…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-hi placeholder:text-dim outline-none"
          />
        </div>
        <button
          onClick={handleExport}
          title="Export Library"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-line text-dim text-[12px] hover:text-lo hover:border-elevated transition-colors shrink-0"
        >
          <Download size={13} strokeWidth={1.8} />
          Export
        </button>
        <button
          onClick={() => setModal({ type: "import" })}
          title="Import Library"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-line text-dim text-[12px] hover:text-lo hover:border-elevated transition-colors shrink-0"
        >
          <Upload size={13} strokeWidth={1.8} />
          Import
        </button>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={13} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1 px-6 py-2.5 border-b border-line shrink-0 overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => {
          const count = counts[opt.value] ?? 0;
          const active = filter === opt.value;
          if (opt.value !== "all" && opt.value !== "favorites" && opt.value !== "recent" && count === 0) return null;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium
                transition-colors duration-100 shrink-0
                ${active ? "bg-hover text-hi" : "text-dim hover:text-lo hover:bg-card"}
              `}
            >
              {opt.value === "favorites" && (
                <Star size={11} strokeWidth={2} className={active ? "text-amber-400 fill-amber-400" : ""} />
              )}
              {opt.label}
              <span className={`text-[10px] ${active ? "text-lo" : "text-dim"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Toast message={toast} onDone={() => setToast(null)} />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          filtered={items.length > 0}
          filterLabel={activeFilterLabel}
          onAdd={() => setModal({ type: "add" })}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-4 px-6">
            <div className="bg-card border border-line rounded-xl overflow-hidden">
              {filtered.map((item, i) => (
                <div key={item.id} className={i < filtered.length - 1 ? "border-b border-line" : ""}>
                  <ItemRow
                    item={item}
                    onEdit={() => setModal({ type: "edit", item })}
                    onDelete={() => setModal({ type: "delete", item })}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.type === "add" && (
        <LauncherModal onSave={addItem} onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit" && (
        <LauncherModal item={modal.item} onSave={updateItem} onClose={() => setModal(null)} />
      )}
      {modal?.type === "delete" && (
        <ConfirmDelete
          item={modal.item}
          onConfirm={async () => { await deleteItem(modal.item.id); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "import" && (
        <ImportModal
          onDone={(msg) => { setModal(null); setToast(msg); }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
