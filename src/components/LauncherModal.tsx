import { useState } from "react";
import { X, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { LauncherItem, ItemType } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#3B82F6", "#EC4899", "#14B8A6"];

const PROJECT_CATEGORIES = [
  { value: "coding", label: "Coding" },
  { value: "university", label: "University" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

const TYPE_TABS: { value: ItemType; label: string }[] = [
  { value: "app", label: "App" },
  { value: "project", label: "Project" },
  { value: "file", label: "File" },
  { value: "folder", label: "Folder" },
  { value: "website", label: "Website" },
];

const TYPE_DEFAULT_COLOR: Record<ItemType, string> = {
  app: "#6366F1",
  project: "#22C55E",
  file: "#F59E0B",
  folder: "#3B82F6",
  website: "#EC4899",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function nameFromPath(path: string): string {
  const basename = path.split("/").pop() ?? path;
  return basename.replace(/\.app$/, "");
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// ── Form types ────────────────────────────────────────────────────────────────

interface FormState {
  type: ItemType;
  name: string;
  description: string;
  target: string;
  color: string;
  projectCategory: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

interface LauncherModalProps {
  item?: LauncherItem;
  defaultType?: ItemType;
  onSave: (item: LauncherItem) => Promise<void>;
  onClose: () => void;
}

export function LauncherModal({ item, defaultType, onSave, onClose }: LauncherModalProps) {
  const [form, setForm] = useState<FormState>({
    type: item?.type ?? defaultType ?? "app",
    name: item?.name ?? "",
    description: item?.description ?? "",
    target: item?.target ?? "",
    color: item?.color ?? TYPE_DEFAULT_COLOR[item?.type ?? defaultType ?? "app"],
    projectCategory: item?.projectCategory ?? "coding",
  });
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function changeType(type: ItemType) {
    setForm((f) => ({
      ...f,
      type,
      target: "",
      color: TYPE_DEFAULT_COLOR[type],
    }));
    setError(null);
  }

  async function handleBrowse() {
    setPicking(true);
    try {
      let result: string | null = null;

      if (form.type === "app") {
        const picked = await open({
          directory: false,
          multiple: false,
          filters: [{ name: "Applications", extensions: ["app"] }],
          defaultPath: "/Applications",
        });
        result = typeof picked === "string" ? picked : null;
      } else if (form.type === "file") {
        const picked = await open({ directory: false, multiple: false });
        result = typeof picked === "string" ? picked : null;
      } else {
        // project or folder
        const picked = await open({ directory: true, multiple: false });
        result = typeof picked === "string" ? picked : null;
      }

      if (result) {
        const autoName = nameFromPath(result);
        setForm((f) => ({
          ...f,
          target: result!,
          name: f.name || autoName,
        }));
        setError(null);
      }
    } finally {
      setPicking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError("Name is required."); return; }
    if (!form.target.trim()) { setError("Target is required."); return; }

    if (form.type === "website") {
      if (!isValidUrl(form.target)) {
        setError("Enter a valid https:// or http:// URL.");
        return;
      }
    } else {
      const exists = await invoke<boolean>("path_exists", { path: form.target });
      if (!exists) { setError("That path doesn't exist on disk."); return; }
    }

    setSaving(true);
    try {
      await onSave({
        id: item?.id ?? crypto.randomUUID(),
        type: form.type,
        name,
        description: form.description.trim(),
        target: form.target,
        color: form.color,
        createdAt: item?.createdAt ?? new Date().toISOString(),
        projectCategory: form.type === "project" ? form.projectCategory : undefined,
      });
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const isEditing = !!item;
  const showBrowse = form.type !== "website";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[480px] shadow-2xl">
        <form onSubmit={handleSubmit}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="text-[14px] font-semibold text-hi">
              {isEditing ? "Edit Item" : "Add Launcher Item"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-dim hover:text-lo hover:bg-hover transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Type selector — only shown when adding */}
          {!isEditing && (
            <div className="flex gap-1 px-6 pt-5">
              {TYPE_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => changeType(t.value)}
                  className={`
                    flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-100
                    ${form.type === t.value
                      ? "bg-hover text-hi"
                      : "text-dim hover:text-lo hover:bg-hover/60"
                    }
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <Field label="Name">
              <input
                className={inputClass}
                placeholder={form.type === "website" ? "GitHub" : "My Item"}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>

            {/* Description */}
            <Field label="Description (optional)">
              <input
                className={inputClass}
                placeholder="A short description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>

            {/* Target */}
            <Field label={form.type === "website" ? "URL" : "Path"}>
              {form.type === "website" ? (
                <input
                  className={inputClass}
                  placeholder="https://github.com"
                  value={form.target}
                  onChange={(e) => set("target", e.target.value)}
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder={
                      form.type === "app"
                        ? "/Applications/Safari.app"
                        : form.type === "file"
                        ? "/Users/you/Documents/file.pdf"
                        : "/Users/you/Projects/my-project"
                    }
                    value={form.target}
                    onChange={(e) => set("target", e.target.value)}
                  />
                  {showBrowse && (
                    <button
                      type="button"
                      onClick={handleBrowse}
                      disabled={picking}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-hover border border-line text-[12px] text-lo hover:text-hi hover:border-elevated transition-colors disabled:opacity-50"
                    >
                      <FolderOpen size={13} strokeWidth={1.8} />
                      Browse
                    </button>
                  )}
                </div>
              )}
            </Field>

            {/* Project category */}
            {form.type === "project" && (
              <Field label="Category">
                <select
                  className={inputClass + " cursor-pointer"}
                  value={form.projectCategory}
                  onChange={(e) => set("projectCategory", e.target.value)}
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            )}

            {/* Color */}
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

            {/* Error */}
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
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Item"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
