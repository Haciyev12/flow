import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Keyboard, Download, Upload, Trash2, Info,
  CheckCircle2, AlertTriangle, Pencil, X,
  LogIn, EyeOff, Monitor, Zap,
} from "lucide-react";

// ── App settings model ────────────────────────────────────────────────────────

interface AppSettings {
  paletteShortcut: string;
  launchAtLogin: boolean;
  keepInBackground: boolean;
  showMainWindowAtStartup: boolean;
  openPaletteAtStartup: boolean;
}

function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    invoke<AppSettings>("get_settings").then(setSettings).catch(() => {});
  }, []);

  async function updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): Promise<string | null> {
    if (!settings) return null;
    const next = { ...settings, [key]: value };
    setSettings(next);
    return invoke<string | null>("save_app_settings", { settings: next }).catch(
      (e) => String(e),
    );
  }

  return { settings, updateSetting };
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
        enabled ? "bg-accent" : "bg-elevated"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

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
  icon, label, description, action, children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-line last:border-0">
      <div className="flex items-center gap-4">
        <div className="text-dim shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-hi">{label}</p>
          {description && <p className="text-[12px] text-lo mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Key badge ─────────────────────────────────────────────────────────────────

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

// ── Shortcut utilities ────────────────────────────────────────────────────────

/** Convert a Tauri shortcut string to display symbols. */
function shortcutToKeys(shortcut: string): string[] {
  return shortcut.split("+").map((part) => {
    switch (part) {
      case "CommandOrControl":
      case "CmdOrCtrl":    return "⌘";
      case "Shift":        return "⇧";
      case "Alt":          return "⌥";
      case "Control":      return "⌃";
      case "Super":        return "⌘";
      case "Space":        return "Space";
      default:             return part;
    }
  });
}

/** Map a DOM key name to Tauri's key name format. Returns null for unknown keys. */
function domKeyToTauri(key: string): string | null {
  if (key === " ") return "Space";
  if (key.length === 1 && /[A-Za-z0-9]/.test(key)) return key.toUpperCase();
  if (/^F\d+$/.test(key)) return key;
  const special: Record<string, string> = {
    ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
    Enter: "Return", Escape: "Escape", Tab: "Tab",
    Backspace: "Backspace", Delete: "Delete",
    ",": "Comma", ".": "Period", "/": "Slash", ";": "Semicolon",
    "'": "Quote", "[": "BracketLeft", "]": "BracketRight",
    "\\": "Backslash", "`": "Grave", "-": "Minus", "=": "Equal",
  };
  return special[key] ?? null;
}

/** Build a Tauri shortcut string from a keydown event. Returns null if incomplete. */
function captureFromEvent(e: React.KeyboardEvent): string | null {
  const isModifier = ["Meta", "Control", "Alt", "Shift"].includes(e.key);
  if (isModifier) return null; // Still waiting for the main key

  const tauriKey = domKeyToTauri(e.key);
  if (!tauriKey) return null;

  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("CommandOrControl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  if (parts.length === 0) return null; // No modifier — invalid
  parts.push(tauriKey);
  return parts.join("+");
}

// ── Shortcut recorder ─────────────────────────────────────────────────────────

function ShortcutRecorder({ onSaved }: { onSaved: (msg: string) => void }) {
  const [current, setCurrent]     = useState<string | null>(null);
  const [mode, setMode]           = useState<"display" | "recording" | "saving">("display");
  const [captured, setCaptured]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const captureRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<string>("get_palette_shortcut").then(setCurrent).catch(() => {});
  }, []);

  function startRecording() {
    setCaptured(null);
    setError(null);
    setMode("recording");
    setTimeout(() => captureRef.current?.focus(), 30);
  }

  function cancelRecording() {
    setCaptured(null);
    setError(null);
    setMode("display");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") { cancelRecording(); return; }

    const shortcut = captureFromEvent(e);
    if (shortcut) {
      setCaptured(shortcut);
      setError(null);
      setMode("saving");
    }
  }

  async function save() {
    if (!captured) return;
    setError(null);
    try {
      await invoke("set_palette_shortcut", { shortcut: captured });
      setCurrent(captured);
      setCaptured(null);
      setMode("display");
      onSaved(`Shortcut changed to ${shortcutToKeys(captured).join("")}`);
    } catch (e) {
      setError(String(e));
      setMode("recording");
      setTimeout(() => captureRef.current?.focus(), 30);
    }
  }

  const displayKeys = current ? shortcutToKeys(current) : ["⌘", "⇧", "Space"];
  const capturedKeys = captured ? shortcutToKeys(captured) : [];

  return (
    <Row
      icon={<Keyboard size={16} strokeWidth={1.8} />}
      label="Open Command Palette"
      description="Global shortcut — works from anywhere on your Mac."
    >
      <div className="ml-9 mt-3 space-y-2">
        {/* Display mode */}
        {mode === "display" && (
          <div className="flex items-center gap-3">
            <Keys keys={displayKeys} />
            <button
              onClick={startRecording}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-dim hover:text-lo hover:bg-hover border border-transparent hover:border-line transition-colors"
            >
              <Pencil size={11} strokeWidth={1.8} />
              Change
            </button>
          </div>
        )}

        {/* Recording mode */}
        {mode === "recording" && (
          <div className="space-y-2">
            <div
              ref={captureRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-hover border border-accent/50 outline-none cursor-default text-[12px] text-dim focus:border-accent transition-colors"
            >
              <Keyboard size={13} strokeWidth={1.8} className="text-accent shrink-0" />
              Press your shortcut combination…
              <span className="ml-auto text-[10px] text-dim/60">Esc to cancel</span>
            </div>
            <button
              onClick={cancelRecording}
              className="text-[11px] text-dim hover:text-lo transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Saving mode — preview + confirm */}
        {mode === "saving" && captured && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-hover border border-line">
              <span className="text-[11px] text-dim">New shortcut:</span>
              <Keys keys={capturedKeys} />
            </div>
            {error && (
              <p className="text-[11px] text-red-400">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                <CheckCircle2 size={12} strokeWidth={2} />
                Save
              </button>
              <button
                onClick={() => { setCaptured(null); setMode("recording"); setTimeout(() => captureRef.current?.focus(), 30); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-line text-[12px] text-lo hover:text-hi transition-colors"
              >
                <X size={12} strokeWidth={2} />
                Re-capture
              </button>
              <button
                onClick={cancelRecording}
                className="text-[11px] text-dim hover:text-lo transition-colors px-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Row>
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
          Export a backup first if you want to restore later.
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
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
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
  const { settings, updateSetting } = useSettings();

  function handleToggle<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    updateSetting(key, value)
      .then((warning) => { if (warning) setToast(warning); })
      .catch((err) => setToast(`Failed to save: ${String(err)}`));
  }

  async function handleExport() {
    try {
      const json = await invoke<string>("export_config");
      const data = JSON.parse(json);
      data.exportedAt = new Date().toISOString();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("Library exported.");
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

        {/* Startup & Background */}
        <Section title="Startup & Background">
          {settings && (
            <Card>
              <Row
                icon={<LogIn size={16} strokeWidth={1.8} />}
                label="Launch at Login"
                description="Start Flow automatically when you log in. Requires the app installed in /Applications."
                action={
                  <Toggle
                    enabled={settings.launchAtLogin}
                    onChange={(v) => handleToggle("launchAtLogin", v)}
                  />
                }
              />
              <Row
                icon={<EyeOff size={16} strokeWidth={1.8} />}
                label="Keep Running in Background"
                description="Closing the main window hides Flow instead of quitting it."
                action={
                  <Toggle
                    enabled={settings.keepInBackground}
                    onChange={(v) => handleToggle("keepInBackground", v)}
                  />
                }
              />
              <Row
                icon={<Monitor size={16} strokeWidth={1.8} />}
                label="Show Main Window at Startup"
                description="Open the main Flow window when the app launches."
                action={
                  <Toggle
                    enabled={settings.showMainWindowAtStartup}
                    onChange={(v) => handleToggle("showMainWindowAtStartup", v)}
                  />
                }
              />
              <Row
                icon={<Zap size={16} strokeWidth={1.8} />}
                label="Open Command Palette at Startup"
                description="Show the command palette immediately after Flow launches."
                action={
                  <Toggle
                    enabled={settings.openPaletteAtStartup}
                    onChange={(v) => handleToggle("openPaletteAtStartup", v)}
                  />
                }
              />
            </Card>
          )}
        </Section>

        {/* Global shortcut */}
        <Section title="Shortcuts">
          <Card>
            <ShortcutRecorder onSaved={(msg) => setToast(msg)} />
          </Card>

          <Card>
            {[
              { label: "Navigate results",   keys: ["↑", "↓"] },
              { label: "Execute selected",   keys: ["↵"] },
              { label: "Close palette",      keys: ["Esc"] },
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
              action={<span className="text-[11px] text-dim font-mono">v0.1.0</span>}
            />
          </Card>
        </Section>

      </div>

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
