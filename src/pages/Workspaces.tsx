import { useState } from "react";
import {
  Plus, ChevronLeft, Pencil, Trash2, ChevronUp, ChevronDown,
  X, AppWindow, FolderOpen, FileText, Folder, Globe,
  Code2, BookOpen, Zap, Target, Briefcase, Star,
  Coffee, Music, Heart, Terminal, Layers, AlertTriangle,
} from "lucide-react";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { useLauncher } from "../hooks/useLauncher";
import { WorkspaceFormModal } from "../components/WorkspaceFormModal";
import { ItemPickerModal } from "../components/ItemPickerModal";
import type { Workspace, WorkspaceIconName, LauncherItem, ItemType } from "../types";

// ── Icon registry ─────────────────────────────────────────────────────────────

const ICON_COMPONENTS: Record<WorkspaceIconName, React.ReactNode> = {
  "code2":     <Code2     size={18} strokeWidth={1.8} />,
  "book-open": <BookOpen  size={18} strokeWidth={1.8} />,
  "zap":       <Zap       size={18} strokeWidth={1.8} />,
  "globe":     <Globe     size={18} strokeWidth={1.8} />,
  "layers":    <Layers    size={18} strokeWidth={1.8} />,
  "briefcase": <Briefcase size={18} strokeWidth={1.8} />,
  "star":      <Star      size={18} strokeWidth={1.8} />,
  "coffee":    <Coffee    size={18} strokeWidth={1.8} />,
  "music":     <Music     size={18} strokeWidth={1.8} />,
  "target":    <Target    size={18} strokeWidth={1.8} />,
  "heart":     <Heart     size={18} strokeWidth={1.8} />,
  "terminal":  <Terminal  size={18} strokeWidth={1.8} />,
};


const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  app:     <AppWindow  size={13} strokeWidth={1.8} />,
  project: <FolderOpen size={13} strokeWidth={1.8} />,
  file:    <FileText   size={13} strokeWidth={1.8} />,
  folder:  <Folder     size={13} strokeWidth={1.8} />,
  website: <Globe      size={13} strokeWidth={1.8} />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexBg(color: string, opacity = "22") { return color + opacity; }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Confirm delete dialog ─────────────────────────────────────────────────────

function ConfirmDeleteWorkspace({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[360px] p-6 shadow-2xl">
        <h2 className="text-[14px] font-semibold text-hi mb-2">Delete Workspace</h2>
        <p className="text-[13px] text-lo leading-relaxed">
          Delete <span className="text-hi font-medium">{name}</span>? This removes the
          workspace configuration. Your Library items are not affected.
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Workspace card (list view) ────────────────────────────────────────────────

interface WorkspaceCardProps {
  workspace: Workspace;
  previewItems: (LauncherItem | null)[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function WorkspaceCard({ workspace, previewItems, onClick, onEdit, onDelete }: WorkspaceCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-line rounded-xl p-5 hover:bg-hover hover:border-elevated transition-all duration-150 cursor-default group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: hexBg(workspace.color), color: workspace.color }}
          >
            {ICON_COMPONENTS[workspace.icon]}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-hi leading-snug">{workspace.name}</p>
            <p className="text-[11px] text-dim mt-0.5">
              {workspace.itemIds.length} {workspace.itemIds.length === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        {/* Hover actions */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="w-6 h-6 rounded-md flex items-center justify-center text-dim hover:text-lo hover:bg-elevated transition-colors"
            title="Edit"
          >
            <Pencil size={12} strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            className="w-6 h-6 rounded-md flex items-center justify-center text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Description */}
      {workspace.description && (
        <p className="text-[12px] text-lo mb-3 line-clamp-2 leading-relaxed">
          {workspace.description}
        </p>
      )}

      {/* Item preview dots */}
      {previewItems.length > 0 && (
        <div className="flex items-center gap-1.5 mt-auto">
          {previewItems.map((item, i) =>
            item ? (
              <div
                key={item.id}
                title={item.name}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: hexBg(item.color), color: item.color }}
              >
                <span style={{ display: "flex" }}>{TYPE_ICONS[item.type]}</span>
              </div>
            ) : (
              <div
                key={i}
                className="w-6 h-6 rounded-md bg-elevated flex items-center justify-center"
                title="Deleted item"
              >
                <AlertTriangle size={10} className="text-dim" />
              </div>
            )
          )}
          {workspace.itemIds.length > 4 && (
            <span className="text-[11px] text-dim ml-0.5">
              +{workspace.itemIds.length - 4}
            </span>
          )}
        </div>
      )}

      {workspace.itemIds.length === 0 && (
        <p className="text-[11px] text-dim italic">No items yet — click to add some.</p>
      )}
    </div>
  );
}

// ── Workspace detail view ─────────────────────────────────────────────────────

interface WorkspaceDetailProps {
  workspace: Workspace;
  allItems: LauncherItem[];
  onBack: () => void;
  onUpdate: (ws: Workspace) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type DetailModal =
  | { type: "edit" }
  | { type: "addItems" }
  | { type: "deleteWorkspace" }
  | null;

function WorkspaceDetail({
  workspace,
  allItems,
  onBack,
  onUpdate,
  onDelete,
}: WorkspaceDetailProps) {
  const [modal, setModal] = useState<DetailModal>(null);

  // Resolve itemIds to items (null = deleted from Library)
  const resolvedItems: { id: string; item: LauncherItem | null }[] =
    workspace.itemIds.map((id) => ({
      id,
      item: allItems.find((i) => i.id === id) ?? null,
    }));

  function moveItem(index: number, dir: "up" | "down") {
    const ids = [...workspace.itemIds];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onUpdate({ ...workspace, itemIds: ids, updatedAt: new Date().toISOString() });
  }

  function removeItem(id: string) {
    onUpdate({
      ...workspace,
      itemIds: workspace.itemIds.filter((i) => i !== id),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleAddItems(newIds: string[]) {
    onUpdate({
      ...workspace,
      itemIds: [...workspace.itemIds, ...newIds],
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Back bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-line shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-dim hover:text-lo transition-colors cursor-default"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          Workspaces
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

          {/* Workspace header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: hexBg(workspace.color), color: workspace.color }}
              >
                {ICON_COMPONENTS[workspace.icon]}
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-hi tracking-tight">
                  {workspace.name}
                </h2>
                {workspace.description && (
                  <p className="text-[13px] text-lo mt-0.5">{workspace.description}</p>
                )}
                <p className="text-[11px] text-dim mt-1">
                  {workspace.itemIds.length} {workspace.itemIds.length === 1 ? "item" : "items"}
                  {" · "}Last modified {formatDate(workspace.updatedAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setModal({ type: "edit" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-line text-[12px] text-lo hover:text-hi hover:border-elevated transition-colors"
              >
                <Pencil size={12} strokeWidth={1.8} />
                Edit
              </button>
              <button
                onClick={() => setModal({ type: "deleteWorkspace" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-line text-[12px] text-dim hover:text-red-400 hover:border-red-400/30 transition-colors"
              >
                <Trash2 size={12} strokeWidth={1.8} />
                Delete
              </button>
            </div>
          </div>

          {/* Items section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-dim uppercase tracking-widest">
                Items
              </p>
              <button
                onClick={() => setModal({ type: "addItems" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                <Plus size={12} strokeWidth={2.5} />
                Add Items
              </button>
            </div>

            {resolvedItems.length === 0 ? (
              <div className="bg-card border border-line rounded-xl flex flex-col items-center justify-center py-10">
                <p className="text-[13px] text-lo">No items in this workspace yet.</p>
                <button
                  onClick={() => setModal({ type: "addItems" })}
                  className="mt-3 text-[12px] text-accent hover:opacity-80 transition-opacity"
                >
                  Add from Library →
                </button>
              </div>
            ) : (
              <div className="bg-card border border-line rounded-xl overflow-hidden">
                {resolvedItems.map(({ id, item }, index) => (
                  <div
                    key={id}
                    className={`
                      flex items-center gap-3 px-4 py-3
                      ${index < resolvedItems.length - 1 ? "border-b border-line" : ""}
                    `}
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="w-5 h-5 flex items-center justify-center text-dim hover:text-lo disabled:opacity-25 transition-colors rounded"
                      >
                        <ChevronUp size={12} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => moveItem(index, "down")}
                        disabled={index === resolvedItems.length - 1}
                        className="w-5 h-5 flex items-center justify-center text-dim hover:text-lo disabled:opacity-25 transition-colors rounded"
                      >
                        <ChevronDown size={12} strokeWidth={2} />
                      </button>
                    </div>

                    {item ? (
                      <>
                        {/* Item icon */}
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: hexBg(item.color), color: item.color }}
                        >
                          {TYPE_ICONS[item.type]}
                        </div>

                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-hi">{item.name}</span>
                            <span className="text-[10px] px-1.5 py-[1px] rounded bg-elevated text-dim">
                              {item.type}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-dim truncate mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Stale / deleted item */}
                        <div className="w-7 h-7 rounded-md bg-elevated flex items-center justify-center shrink-0">
                          <AlertTriangle size={12} className="text-dim" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] text-dim italic">Deleted Library item</span>
                          <p className="text-[10px] text-dim/60 mt-0.5 font-mono">{id}</p>
                        </div>
                      </>
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                      title="Remove from workspace"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      {modal?.type === "edit" && (
        <WorkspaceFormModal
          workspace={workspace}
          onSave={onUpdate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "addItems" && (
        <ItemPickerModal
          allItems={allItems}
          existingIds={workspace.itemIds}
          onAdd={handleAddItems}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "deleteWorkspace" && (
        <ConfirmDeleteWorkspace
          name={workspace.name}
          onConfirm={async () => {
            await onDelete(workspace.id);
            onBack();
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Workspace list view ───────────────────────────────────────────────────────

interface WorkspaceListProps {
  workspaces: Workspace[];
  allItems: LauncherItem[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (ws: Workspace) => void;
  onDelete: (ws: Workspace) => void;
}

function WorkspaceList({
  workspaces,
  allItems,
  onSelect,
  onNew,
  onEdit,
  onDelete,
}: WorkspaceListProps) {
  function previewItems(ws: Workspace): (LauncherItem | null)[] {
    return ws.itemIds.slice(0, 4).map(
      (id) => allItems.find((i) => i.id === id) ?? null
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
        <p className="text-[11px] font-semibold text-dim uppercase tracking-widest">
          {workspaces.length} {workspaces.length === 1 ? "Workspace" : "Workspaces"}
        </p>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={13} strokeWidth={2.5} />
          New Workspace
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <div className="w-12 h-12 rounded-xl bg-card border border-line flex items-center justify-center mb-4">
              <Layers size={20} strokeWidth={1.5} className="text-dim" />
            </div>
            <p className="text-[13px] font-medium text-lo">No workspaces yet</p>
            <p className="text-[12px] text-dim mt-1">
              Group your Library items into workflows.
            </p>
            <button
              onClick={onNew}
              className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} strokeWidth={2} />
              New Workspace
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 gap-3">
              {workspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  previewItems={previewItems(ws)}
                  onClick={() => onSelect(ws.id)}
                  onEdit={() => onEdit(ws)}
                  onDelete={() => onDelete(ws)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main exported page ────────────────────────────────────────────────────────

type PageModal =
  | { type: "new" }
  | { type: "edit"; workspace: Workspace }
  | { type: "delete"; workspace: Workspace }
  | null;

export function Workspaces() {
  const { workspaces, loading, error, addWorkspace, updateWorkspace, deleteWorkspace } =
    useWorkspaces();
  const { items } = useLauncher();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<PageModal>(null);

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

  // Detail view
  if (selectedId) {
    const workspace = workspaces.find((w) => w.id === selectedId);
    if (workspace) {
      return (
        <>
          <WorkspaceDetail
            workspace={workspace}
            allItems={items}
            onBack={() => setSelectedId(null)}
            onUpdate={updateWorkspace}
            onDelete={async (id) => {
              await deleteWorkspace(id);
              setSelectedId(null);
            }}
          />
        </>
      );
    }
    // Workspace was deleted while viewing it
    setSelectedId(null);
  }

  // List view
  return (
    <>
      <WorkspaceList
        workspaces={workspaces}
        allItems={items}
        onSelect={setSelectedId}
        onNew={() => setModal({ type: "new" })}
        onEdit={(ws) => setModal({ type: "edit", workspace: ws })}
        onDelete={(ws) => setModal({ type: "delete", workspace: ws })}
      />

      {modal?.type === "new" && (
        <WorkspaceFormModal
          onSave={addWorkspace}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "edit" && (
        <WorkspaceFormModal
          workspace={modal.workspace}
          onSave={updateWorkspace}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmDeleteWorkspace
          name={modal.workspace.name}
          onConfirm={async () => {
            await deleteWorkspace(modal.workspace.id);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}
