import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, FolderOpen, Terminal, Pencil, Trash2, Code2 } from "lucide-react";
import { useProjects } from "../hooks/useProjects";
import { ProjectModal } from "../components/ProjectModal";
import type { StoredProject } from "../types";

// Replaces /Users/<name>/... with ~/...
function displayPath(path: string): string {
  const match = path.match(/^\/Users\/[^/]+(\/.*)?$/);
  if (match) return "~" + (match[1] ?? "");
  return path;
}

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding",
  university: "University",
  personal: "Personal",
  other: "Other",
};

// ── Individual project row ────────────────────────────────────────────────────

interface ProjectRowProps {
  project: StoredProject;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectRow({ project, onEdit, onDelete }: ProjectRowProps) {
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(command: string) {
    setActionError(null);
    try {
      await invoke(command, { path: project.folderPath });
    } catch (e) {
      setActionError(String(e));
      setTimeout(() => setActionError(null), 4000);
    }
  }

  return (
    <div className="group flex items-start gap-4 px-5 py-4 hover:bg-hover transition-colors duration-100">
      {/* Color dot */}
      <div
        className="w-2 h-2 rounded-full mt-[5px] shrink-0"
        style={{ backgroundColor: project.color }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-hi">{project.name}</span>
          <span className="text-[10px] px-1.5 py-[1px] rounded bg-elevated text-dim">
            {CATEGORY_LABELS[project.category] ?? project.category}
          </span>
        </div>
        {project.description && (
          <p className="text-[12px] text-lo mt-0.5 truncate">{project.description}</p>
        )}
        <p className="text-[11px] text-dim mt-0.5 truncate font-mono">
          {displayPath(project.folderPath)}
        </p>
        {actionError && (
          <p className="text-[11px] text-red-400 mt-1">{actionError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
        <ActionButton
          icon={<Code2 size={13} strokeWidth={1.8} />}
          label="VS Code"
          onClick={() => runAction("open_in_vscode")}
        />
        <ActionButton
          icon={<Terminal size={13} strokeWidth={1.8} />}
          label="Terminal"
          onClick={() => runAction("open_in_terminal")}
        />
        <div className="w-px h-4 bg-line mx-1" />
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
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium
        transition-colors duration-100 cursor-default
        ${danger
          ? "text-dim hover:text-red-400 hover:bg-red-400/10"
          : "text-dim hover:text-lo hover:bg-card"
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20">
      <div className="w-12 h-12 rounded-xl bg-card border border-line flex items-center justify-center mb-4">
        <FolderOpen size={20} strokeWidth={1.5} className="text-dim" />
      </div>
      <p className="text-[13px] font-medium text-lo">No projects yet</p>
      <p className="text-[12px] text-dim mt-1">Add your first project to get started.</p>
      <button
        onClick={onAdd}
        className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={14} strokeWidth={2} />
        Add Project
      </button>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  project: StoredProject;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDelete({ project, onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[360px] p-6 shadow-2xl">
        <h2 className="text-[14px] font-semibold text-hi mb-1">Delete Project</h2>
        <p className="text-[13px] text-lo">
          Remove <span className="text-hi font-medium">{project.name}</span> from Flow? This
          does not delete any files.
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

// ── Projects page ─────────────────────────────────────────────────────────────

type Modal =
  | { type: "add" }
  | { type: "edit"; project: StoredProject }
  | { type: "delete"; project: StoredProject }
  | null;

export function Projects() {
  const { projects, loading, error, addProject, updateProject, deleteProject } = useProjects();
  const [modal, setModal] = useState<Modal>(null);

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
      {/* Page toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
        <p className="text-[11px] font-semibold text-dim uppercase tracking-widest">
          {projects.length} {projects.length === 1 ? "Project" : "Projects"}
        </p>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={13} strokeWidth={2.5} />
          Add Project
        </button>
      </div>

      {/* List */}
      {projects.length === 0 ? (
        <EmptyState onAdd={() => setModal({ type: "add" })} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-4">
            <div className="bg-card border border-line rounded-xl overflow-hidden mx-6">
              {projects.map((project, i) => (
                <div
                  key={project.id}
                  className={i < projects.length - 1 ? "border-b border-line" : ""}
                >
                  <ProjectRow
                    project={project}
                    onEdit={() => setModal({ type: "edit", project })}
                    onDelete={() => setModal({ type: "delete", project })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.type === "add" && (
        <ProjectModal
          onSave={addProject}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "edit" && (
        <ProjectModal
          project={modal.project}
          onSave={updateProject}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmDelete
          project={modal.project}
          onConfirm={async () => {
            await deleteProject(modal.project.id);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
