import { useState, useEffect } from "react";
import { X, MessageCircle, Copy, Users } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { ShareDestination, DestinationKind } from "../types";

const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#3B82F6", "#EC4899", "#14B8A6"];

const KIND_OPTIONS: { value: DestinationKind; label: string; description: string }[] = [
  { value: "whatsapp-contact", label: "WhatsApp Contact", description: "Opens a chat with pre-filled text" },
  { value: "whatsapp-group",   label: "WhatsApp Group",   description: "Opens the group; message is copied to clipboard" },
  { value: "copy",             label: "Just Copy",        description: "Copies the message to clipboard only" },
];

interface FormState {
  name: string;
  kind: DestinationKind;
  target: string;
  color: string;
}

interface DestinationModalProps {
  destination?: ShareDestination;
  onSave: (d: ShareDestination) => Promise<void>;
  onClose: () => void;
}

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

export function DestinationModal({ destination, onSave, onClose }: DestinationModalProps) {
  const [form, setForm] = useState<FormState>({
    name: destination?.name ?? "",
    kind: destination?.kind ?? "whatsapp-contact",
    target: destination?.target ?? "",
    color: destination?.color ?? "#22C55E",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset target when kind changes (except when editing an existing destination)
  useEffect(() => {
    if (!destination) {
      setForm((f) => ({ ...f, target: "" }));
    }
  }, [form.kind, destination]);

  const needsTarget = form.kind !== "copy";
  const targetLabel =
    form.kind === "whatsapp-contact" ? "Phone Number (with country code, e.g. 15551234567)" :
    form.kind === "whatsapp-group"   ? "Group Invite URL (https://chat.whatsapp.com/…)" : "";
  const targetPlaceholder =
    form.kind === "whatsapp-contact" ? "15551234567" :
    form.kind === "whatsapp-group"   ? "https://chat.whatsapp.com/ABC123" : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = form.name.trim();
    if (!name) { setError("Name is required."); return; }
    if (needsTarget && !form.target.trim()) { setError("Target is required for this destination type."); return; }

    setSaving(true);
    try {
      // Validate target on the Rust side
      let normalizedTarget: string | undefined;
      if (needsTarget) {
        normalizedTarget = await invoke<string>("validate_destination", {
          kind: form.kind,
          target: form.target.trim(),
        });
      }

      await onSave({
        id: destination?.id ?? crypto.randomUUID(),
        name,
        kind: form.kind,
        target: normalizedTarget || undefined,
        color: form.color,
        createdAt: destination?.createdAt ?? new Date().toISOString(),
      });
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-line rounded-2xl w-[460px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-line">
          <h2 className="text-[14px] font-semibold text-hi">
            {destination ? "Edit Destination" : "Add Destination"}
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-dim hover:text-lo hover:bg-hover transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Kind selector */}
          <Field label="Type">
            <div className="space-y-1.5">
              {KIND_OPTIONS.map((opt) => {
                const Icon = opt.value === "copy" ? Copy : opt.value === "whatsapp-group" ? Users : MessageCircle;
                const active = form.kind === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, kind: opt.value }))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      active ? "border-accent bg-accent/10" : "border-line bg-hover hover:border-elevated"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.8} className={active ? "text-accent" : "text-dim"} />
                    <div className="min-w-0">
                      <p className={`text-[12px] font-medium ${active ? "text-accent" : "text-hi"}`}>{opt.label}</p>
                      <p className="text-[11px] text-dim truncate">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Name */}
          <Field label="Name">
            <input
              className={inputClass}
              placeholder='e.g. "Study Group" or "John (WhatsApp)"'
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </Field>

          {/* Target — only shown for contact/group */}
          {needsTarget && (
            <Field label={targetLabel}>
              <input
                className={inputClass}
                placeholder={targetPlaceholder}
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
              />
            </Field>
          )}

          {/* Color */}
          <Field label="Color">
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    boxShadow: form.color === c
                      ? `0 0 0 2px #161619, 0 0 0 3.5px ${c}`
                      : undefined,
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

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] text-lo hover:text-hi rounded-lg hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-[12px] font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : destination ? "Save Changes" : "Add Destination"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
