import { useState } from "react";
import {
  X, Code2, BookOpen, Zap, Globe, Layers,
  Briefcase, Star, Coffee, Music, Target, Heart, Terminal,
} from "lucide-react";
import type { Workspace, WorkspaceIconName } from "../types";

// ── Icon registry ─────────────────────────────────────────────────────────────

const ICONS: { key: WorkspaceIconName; component: React.ReactNode }[] = [
  { key: "code2",     component: <Code2     size={16} strokeWidth={1.8} /> },
  { key: "terminal",  component: <Terminal  size={16} strokeWidth={1.8} /> },
  { key: "zap",       component: <Zap       size={16} strokeWidth={1.8} /> },
  { key: "target",    component: <Target    size={16} strokeWidth={1.8} /> },
  { key: "book-open", component: <BookOpen  size={16} strokeWidth={1.8} /> },
  { key: "briefcase", component: <Briefcase size={16} strokeWidth={1.8} /> },
  { key: "globe",     component: <Globe     size={16} strokeWidth={1.8} /> },
  { key: "layers",    component: <Layers    size={16} strokeWidth={1.8} /> },
  { key: "music",     component: <Music     size={16} strokeWidth={1.8} /> },
  { key: "coffee",    component: <Coffee    size={16} strokeWidth={1.8} /> },
  { key: "star",      component: <Star      size={16} strokeWidth={1.8} /> },
  { key: "heart",     component: <Heart     size={16} strokeWidth={1.8} /> },
];

const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#3B82F6", "#EC4899", "#14B8A6"];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  icon: WorkspaceIconName;
  color: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WorkspaceFormModalProps {
  workspace?: Workspace;
  onSave: (ws: Workspace) => Promise<void>;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-hover border border-line rounded-lg px-3 py-2 text-[13px] text-hi placeholder:text-dim outline-none focus:border-accent transition-colors duration-100";

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

export function WorkspaceFormModal({ workspace, onSave, onClose }: WorkspaceFormModalProps) {
  const [form, setForm] = useState<FormState>({
    name: workspace?.name ?? "",
    description: workspace?.description ?? "",
    icon: workspace?.icon ?? "zap",
    color: workspace?.color ?? COLORS[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      await onSave({
        id: workspace?.id ?? crypto.randomUUID(),
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon,
        color: form.color,
        itemIds: workspace?.itemIds ?? [],
        itemSettings: workspace?.itemSettings ?? {},
        createdAt: workspace?.createdAt ?? now,
        updatedAt: now,
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
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[460px] shadow-2xl">
        <form onSubmit={handleSubmit}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="text-[14px] font-semibold text-hi">
              {workspace ? "Edit Workspace" : "New Workspace"}
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
          <div className="px-6 py-5 space-y-5">
            <Field label="Name">
              <input
                className={inputClass}
                placeholder="Coding Mode"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Description (optional)">
              <input
                className={inputClass}
                placeholder="What is this workspace for?"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>

            {/* Icon picker */}
            <Field label="Icon">
              <div className="grid grid-cols-6 gap-1.5">
                {ICONS.map(({ key, component }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("icon", key)}
                    className={`
                      flex items-center justify-center w-full aspect-square rounded-lg
                      transition-all duration-100
                      ${form.icon === key
                        ? "bg-hover border border-accent text-accent"
                        : "bg-hover/50 border border-transparent text-dim hover:text-lo hover:border-line"
                      }
                    `}
                  >
                    {component}
                  </button>
                ))}
              </div>
            </Field>

            {/* Color picker */}
            <Field label="Color">
              <div className="flex items-center gap-2.5">
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
                          ? `0 0 0 2px #161619, 0 0 0 3.5px ${c}`
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
              {saving ? "Saving…" : workspace ? "Save Changes" : "Create Workspace"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
