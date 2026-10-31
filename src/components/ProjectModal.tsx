import { useState } from "react";
import { X, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { StoredProject, ProjectCategory } from "../types";

const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#3B82F6",
  "#EC4899",
  "#14B8A6",
];

const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: "coding", label: "Coding" },
  { value: "university", label: "University" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

interface FormState {
  name: string;
  description: string;
  folderPath: string;
  category: ProjectCategory;
  color: string;
}

interface ProjectModalProps {
  project?: StoredProject;
  onSave: (project: StoredProject) => Promise<void>;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-lo uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-hover border border-line rounded-lg px-3 py-2 text-[13px] text-hi placeholder:text-dim outline-none focus:border-accent transition-colors duration-100";

export function ProjectModal({ project, onSave, onClose }: ProjectModalProps) {
  const [form, setForm] = useState<FormState>({
    name: project?.name ?? "",
    description: project?.description ?? "",
    folderPath: project?.folderPath ?? "",
    category: project?.category ?? "coding",
    color: project?.color ?? COLORS[0],
  });
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handlePickFolder() {
    setPicking(true);
    try {
      const result = await open({ directory: true, multiple: false, title: "Select Project Folder" });
      if (typeof result === "string" && result) {
        set("folderPath", result);
      }
    } finally {
      setPicking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.folderPath.trim()) { setError("Folder path is required."); return; }

    const exists = await invoke<boolean>("path_exists", { path: form.folderPath });
    if (!exists) { setError("That folder doesn't exist on disk."); return; }

    setSaving(true);
    try {
      await onSave({
        id: project?.id ?? crypto.randomUUID(),
        name: form.name.trim(),
        description: form.description.trim(),
        folderPath: form.folderPath,
        category: form.category,
        color: form.color,
        createdAt: project?.createdAt ?? new Date().toISOString(),
      });
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[460px] shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="text-[14px] font-semibold text-hi">
              {project ? "Edit Project" : "Add Project"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-dim hover:text-lo hover:bg-hover transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <Field label="Name">
              <input
                className={inputClass}
                placeholder="My Project"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Description">
              <input
                className={inputClass}
                placeholder="What is this project about?"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>

            <Field label="Folder Path">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="/Users/you/Projects/my-project"
                  value={form.folderPath}
                  onChange={(e) => set("folderPath", e.target.value)}
                />
                <button
                  type="button"
                  onClick={handlePickFolder}
                  disabled={picking}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-hover border border-line text-[12px] text-lo hover:text-hi hover:border-elevated transition-colors disabled:opacity-50"
                >
                  <FolderOpen size={13} strokeWidth={1.8} />
                  Browse
                </button>
              </div>
            </Field>

            <Field label="Category">
              <select
                className={inputClass + " cursor-pointer"}
                value={form.category}
                onChange={(e) => set("category", e.target.value as ProjectCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Color">
              <div className="flex items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      boxShadow:
                        form.color === c
                          ? `0 0 0 2px #0C0C0E, 0 0 0 4px ${c}`
                          : "none",
                    }}
                  />
                ))}
              </div>
            </Field>

            {error && (
              <p className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] text-lo hover:text-hi hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : project ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
