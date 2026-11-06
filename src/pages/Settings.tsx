import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Keyboard, Download, Upload, Trash2, Info,
  CheckCircle2, AlertTriangle,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold text-dim uppercase tracking-widest">{title}</p>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-xl overflow-hidden">
      {children}
    </div>
  );
}

function Row({
  icon, label, description, action,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0">
      <div className="text-dim shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-hi">{label}</p>
        {description && <p className="text-[12px] text-lo mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Keyboard shortcut badge ───────────────────────────────────────────────────

function Keys({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="px-2 py-0.5 rounded bg-elevated border border-line text-[11px] text-lo font-mono"
        >
          {k}
        </kbd>
      ))}
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
  const fileRef = useState(() => {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = ".json";
    return el;
  })[0];

  const handlePick = useCallback(() => {
    fileRef.onchange = async () => {
      const file = fileRef.files?.[0];
      if (!file) return;
      setStatus("loading");
      try {
        const content = await file.text();
        const result = await invoke<{ itemsAdded: number; workspacesAdded: number }>(
          "import_config", { content, merge: mode === "merge" }
        );
        onDone(
          `Imported ${result.itemsAdded} item${result.itemsAdded !== 1 ? "s" : ""} ` +
          `and ${result.workspacesAdded} workspace${result.workspacesAdded !== 1 ? "s" : ""}. Reloading…`
        );
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setStatus("error");
        setErrorMsg(String(err));
      }
      fileRef.value = "";
    };
    fileRef.click();
  }, [fileRef, mode, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[400px] p-6 shadow-2xl">
        <h2 className="text-[14px] font-semibold text-hi mb-1">Import Configuration</h2>
        <p className="text-[12px] text-lo mb-5">
          Choose a Flow backup JSON to restore your Library and workspaces.
        </p>
        <div className="flex gap-2 mb-5">
          {(["merge", "replace"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                mode === m ? "bg-accent/10 border-accent text-accent" : "bg-hover border-line text-lo hover:text-hi"
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
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] text-lo hover:text-hi hover:bg-hover transition-colors">
            Cancel
          </button>
          <button
            disabled={status === "loading"}
            onClick={handlePick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Upload size={13} strokeWidth={2} />
            {status === "loading" ? "Importing…" : "Choose File"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Clear data confirmation ───────────────────────────────────────────────────

function ClearDataModal({ onConfirm, onCancel }: {
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-line rounded-2xl w-[380px] p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <h2 className="text-[14px] font-semibold text-hi">Clear All Data</h2>
        </div>
        <p className="text-[13px] text-lo leading-relaxed mb-5">
          This permanently deletes your entire Library, all workspaces, and your activity history.
          This cannot be undone. Export a backup first if you want to restore later.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] text-lo hover:text-hi hover:bg-hover transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-red-500/90 text-white hover:bg-red-500 transition-colors"
          >
            Clear Everything
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useState(() => { setTimeout(onDone, 4000); });
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 bg-card border border-line rounded-xl shadow-lg text-[12px] text-lo">
      <CheckCircle2 size={14} className="text-accent-green shrink-0" />
      {message}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Modal = "import" | "clear" | null;

export function Settings() {
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      setToast("Library exported to your Downloads folder.");
    } catch (e) {
      setToast(`Export failed: ${String(e)}`);
    }
  }

  async function handleClearConfirmed() {
    try {
      await invoke("clear_all_data");
      setModal(null);
      setToast("All data cleared. Reloading…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setToast(`Clear failed: ${String(e)}`);
      setModal(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">

        {/* Global shortcut */}
        <Section title="Shortcuts">
          <Card>
            <Row
              icon={<Keyboard size={16} strokeWidth={1.8} />}
              label="Open Command Palette"
              description="Open from anywhere on your Mac to search and launch items."
              action={<Keys keys={["⌘", "⇧", "Space"]} />}
            />
          </Card>

          <Card>
            {[
              { label: "Navigate results",      keys: ["↑", "↓"] },
              { label: "Execute selected",       keys: ["↵"] },
              { label: "Close palette",          keys: ["Esc"] },
              { label: "Move item up / down",    keys: ["↑", "↓"] },
            ].map(({ label, keys }) => (
              <Row
                key={label}
                icon={<Keyboard size={14} strokeWidth={1.5} />}
                label={label}
                action={<Keys keys={keys} />}
              />
            ))}
          </Card>
        </Section>

        {/* Data */}
        <Section title="Data">
          <Card>
            <Row
              icon={<Download size={16} strokeWidth={1.8} />}
              label="Export Library"
              description="Download a JSON backup of your Library and workspaces."
              action={
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-line text-[12px] text-lo hover:text-hi hover:border-elevated transition-colors"
                >
                  <Download size={12} strokeWidth={1.8} />
                  Export
                </button>
              }
            />
            <Row
              icon={<Upload size={16} strokeWidth={1.8} />}
              label="Import Library"
              description="Restore from a Flow backup file. Merge or replace existing data."
              action={
                <button
                  onClick={() => setModal("import")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-line text-[12px] text-lo hover:text-hi hover:border-elevated transition-colors"
                >
                  <Upload size={12} strokeWidth={1.8} />
                  Import
                </button>
              }
            />
          </Card>

          <Card>
            <Row
              icon={<Trash2 size={16} strokeWidth={1.8} />}
              label="Clear All Data"
              description="Permanently delete your Library, workspaces, and activity history."
              action={
                <button
                  onClick={() => setModal("clear")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-red-500/20 text-[12px] text-dim hover:text-red-400 hover:border-red-400/30 transition-colors"
                >
                  <Trash2 size={12} strokeWidth={1.8} />
                  Clear
                </button>
              }
            />
          </Card>
        </Section>

        {/* About */}
        <Section title="About">
          <Card>
            <Row
              icon={<Info size={16} strokeWidth={1.8} />}
              label="Flow"
              description="Personal desktop automation — built with Tauri, React, and Rust."
              action={
                <span className="text-[11px] text-dim font-mono">v0.1.0</span>
              }
            />
          </Card>
        </Section>

      </div>

      {/* Modals */}
      {modal === "import" && (
        <ImportModal
          onDone={(msg) => { setModal(null); setToast(msg); }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "clear" && (
        <ClearDataModal
          onConfirm={handleClearConfirmed}
          onCancel={() => setModal(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
