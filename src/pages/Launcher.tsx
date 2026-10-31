import { useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus, Search, AppWindow, FolderOpen, FileText, Folder,
  Globe, Code2, Terminal, Pencil, Trash2, ExternalLink,
} from "lucide-react";
import { useLauncher } from "../hooks/useLauncher";
import { LauncherModal } from "../components/LauncherModal";
import type { LauncherItem, ItemType } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ItemType, string> = {
  app: "App",
  project: "Project",
  file: "File",
  folder: "Folder",
  website: "Website",
};

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  app: <AppWindow size={14} strokeWidth={1.8} />,
  project: <FolderOpen size={14} strokeWidth={1.8} />,
  file: <FileText size={14} strokeWidth={1.8} />,
  folder: <Folder size={14} strokeWidth={1.8} />,
  website: <Globe size={14} strokeWidth={1.8} />,
};

const FILTER_OPTIONS: { value: "all" | ItemType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "app", label: "Apps" },
  { value: "project", label: "Projects" },
  { value: "file", label: "Files" },
  { value: "folder", label: "Folders" },
  { value: "website", label: "Websites" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayTarget(item: LauncherItem): string {
  if (item.type === "website") return item.target;
  const match = item.target.match(/^\/Users\/[^/]+(\/.*)?$/);
  if (match) return "~" + (match[1] ?? "");
  return item.target;
}

function hexBg(color: string): string {
  // Append 22 (hex) ≈ 13% opacity for the icon background
  return color + "22";
}

// ── Action button ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function ActionButton({ icon, label, onClick, danger }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium
        transition-colors duration-100 cursor-default whitespace-nowrap
        ${danger
          ? "text-dim hover:text-red-400 hover:bg-red-400/10"
          : "text-dim hover:text-lo hover:bg-hover"
        }
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
}

function ItemRow({ item, onEdit, onDelete }: ItemRowProps) {
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
    if (item.type === "website") {
      run("open_item_url", { url: item.target });
    } else {
      run("open_item_path", { path: item.target });
    }
  }

  const primaryLabel =
    item.type === "folder" ? "Finder" :
    item.type === "website" ? "Open" :
    item.type === "app" ? "Launch" :
    "Open";

  const primaryIcon =
    item.type === "website" ? <ExternalLink size={13} strokeWidth={1.8} /> :
    item.type === "folder" ? <Folder size={13} strokeWidth={1.8} /> :
    <ExternalLink size={13} strokeWidth={1.8} />;

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
        {/* Primary action */}
        <ActionButton
          icon={primaryIcon}
          label={primaryLabel}
          onClick={primaryAction}
        />

        {/* Project-specific extra actions */}
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

function EmptyState({ filtered, onAdd }: { filtered: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20">
      <div className="w-12 h-12 rounded-xl bg-card border border-line flex items-center justify-center mb-4">
        <FolderOpen size={20} strokeWidth={1.5} className="text-dim" />
      </div>
      {filtered ? (
        <>
          <p className="text-[13px] font-medium text-lo">No matching items</p>
          <p className="text-[12px] text-dim mt-1">Try a different search or filter.</p>
        </>
      ) : (
        <>
          <p className="text-[13px] font-medium text-lo">Nothing in your launcher yet</p>
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

interface ConfirmDeleteProps {
  item: LauncherItem;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDelete({ item, onConfirm, onCancel }: ConfirmDeleteProps) {
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
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] text-lo hover:text-hi hover:bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-red-500/90 text-white hover:bg-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Launcher page ─────────────────────────────────────────────────────────────

type Modal =
  | { type: "add" }
  | { type: "edit"; item: LauncherItem }
  | { type: "delete"; item: LauncherItem }
  | null;

export function Launcher() {
  const { items, loading, error, addItem, updateItem, deleteItem } = useLauncher();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ItemType>("all");
  const [modal, setModal] = useState<Modal>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const item of items) {
      c[item.type] = (c[item.type] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.type !== filter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.target.toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Toolbar: search + add */}
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
          if (opt.value !== "all" && count === 0) return null;
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
              {opt.label}
              <span className={`text-[10px] ${active ? "text-lo" : "text-dim"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          filtered={items.length > 0 && (search !== "" || filter !== "all")}
          onAdd={() => setModal({ type: "add" })}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-4 px-6">
            <div className="bg-card border border-line rounded-xl overflow-hidden">
              {filtered.map((item, i) => (
                <div
                  key={item.id}
                  className={i < filtered.length - 1 ? "border-b border-line" : ""}
                >
                  <ItemRow
                    item={item}
                    onEdit={() => setModal({ type: "edit", item })}
                    onDelete={() => setModal({ type: "delete", item })}
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
        <LauncherModal
          item={modal.item}
          onSave={updateItem}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmDelete
          item={modal.item}
          onConfirm={async () => {
            await deleteItem(modal.item.id);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
