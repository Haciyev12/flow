import { useState, useMemo } from "react";
import { X, Search, Check, AppWindow, FolderOpen, FileText, Folder, Globe } from "lucide-react";
import type { LauncherItem, ItemType } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  app:     <AppWindow  size={13} strokeWidth={1.8} />,
  project: <FolderOpen size={13} strokeWidth={1.8} />,
  file:    <FileText   size={13} strokeWidth={1.8} />,
  folder:  <Folder     size={13} strokeWidth={1.8} />,
  website: <Globe      size={13} strokeWidth={1.8} />,
};

const TYPE_LABELS: Record<ItemType, string> = {
  app: "App", project: "Project", file: "File", folder: "Folder", website: "Website",
};

function hexBg(color: string) { return color + "22"; }

// ── Props ─────────────────────────────────────────────────────────────────────

interface ItemPickerModalProps {
  /** All available Library items. */
  allItems: LauncherItem[];
  /** IDs already in the workspace — excluded from the picker. */
  existingIds: string[];
  onAdd: (ids: string[]) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ItemPickerModal({
  allItems,
  existingIds,
  onAdd,
  onClose,
}: ItemPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Only show items not already in the workspace.
  const available = useMemo(() => {
    const existingSet = new Set(existingIds);
    const q = search.toLowerCase();
    return allItems.filter((item) => {
      if (existingSet.has(item.id)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [allItems, existingIds, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    onAdd([...selected]);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[500px] shadow-2xl flex flex-col max-h-[70vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <h2 className="text-[14px] font-semibold text-hi">Add Items</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-dim hover:text-lo hover:bg-hover transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-line shrink-0">
          <div className="flex items-center gap-2 bg-hover border border-line rounded-lg px-3 py-2">
            <Search size={13} strokeWidth={1.8} className="text-dim shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search Library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-hi placeholder:text-dim outline-none"
            />
          </div>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-[13px] text-lo">
                {allItems.length === existingIds.length
                  ? "All Library items are already in this workspace."
                  : "No items match your search."}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {available.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3
                      transition-colors duration-100 cursor-default text-left
                      ${isSelected ? "bg-hover" : "hover:bg-hover/60"}
                    `}
                  >
                    {/* Check indicator */}
                    <div
                      className={`
                        w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors
                        ${isSelected
                          ? "bg-accent border-accent"
                          : "bg-transparent border-line"
                        }
                      `}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                    </div>

                    {/* Item icon */}
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: hexBg(item.color), color: item.color }}
                    >
                      {TYPE_ICONS[item.type]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-hi">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-[1px] rounded bg-elevated text-dim">
                          {TYPE_LABELS[item.type]}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-dim truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line shrink-0">
          <span className="text-[12px] text-dim">
            {selected.size > 0 ? `${selected.size} selected` : "Select items to add"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] text-lo hover:text-hi hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Add {selected.size > 0 ? `${selected.size} ` : ""}
              {selected.size === 1 ? "item" : "items"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
