import { useState } from "react";
import { X, MessageCircle, Users, Copy, Link, CheckCircle2, Share2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { ShareDestination, WorkspaceShareAction } from "../types";

function kindIcon(kind: string) {
  if (kind === "whatsapp-group")   return <Users  size={14} strokeWidth={1.8} />;
  if (kind === "copy")             return <Copy   size={14} strokeWidth={1.8} />;
  return                                  <MessageCircle size={14} strokeWidth={1.8} />;
}

function kindLabel(kind: string) {
  if (kind === "whatsapp-group")   return "Opens group, message copied";
  if (kind === "copy")             return "Copies message to clipboard";
  return                                  "Opens chat with pre-filled message";
}

function renderTemplate(template: string, link: string, workspaceName: string): string {
  return template.replace(/{link}/g, link).replace(/{workspace}/g, workspaceName);
}

interface SharePickerProps {
  shareAction: WorkspaceShareAction;
  workspaceName: string;
  destinations: ShareDestination[];
  onDismiss: () => void;
}

export function SharePicker({
  shareAction,
  workspaceName,
  destinations,
  onDismiss,
}: SharePickerProps) {
  const [link, setLink] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter destinations to only those in shareAction.destinationIds (or all if empty)
  const visibleDestinations =
    shareAction.destinationIds.length > 0
      ? destinations.filter((d) => shareAction.destinationIds.includes(d.id))
      : destinations;

  const message = renderTemplate(
    shareAction.messageTemplate || "Join my {workspace} session: {link}",
    link.trim() || "[paste link here]",
    workspaceName
  );

  async function handleShare(destinationId: string) {
    if (!link.trim() && destinationId !== "copy-only") {
      setError("Paste your Meet link before sharing.");
      return;
    }
    setError(null);
    setSending(destinationId);
    try {
      await invoke("execute_share", {
        destinationId,
        message,
        destinations: visibleDestinations,
      });
      setSent(destinationId);
      setTimeout(() => {
        setSent(null);
        setSending(null);
      }, 1800);
    } catch (e) {
      setError(String(e));
      setSending(null);
    }
  }

  async function handleJustCopy() {
    const textToCopy = link.trim()
      ? message
      : shareAction.messageTemplate || "Join my {workspace} session: {link}";
    try {
      await invoke("execute_share", {
        destinationId: "__copy__",
        message: textToCopy,
        destinations: [{ id: "__copy__", name: "Copy", kind: "copy", color: "#6366F1", createdAt: "" }],
      });
      setSent("__copy__");
      setTimeout(() => setSent(null), 1800);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative bg-card border border-line rounded-2xl w-[420px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <Share2 size={15} strokeWidth={1.8} className="text-accent" />
            <h2 className="text-[14px] font-semibold text-hi">Share link</h2>
          </div>
          <button
            onClick={onDismiss}
            className="w-6 h-6 flex items-center justify-center rounded-md text-dim hover:text-lo hover:bg-hover transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Meet link input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-lo uppercase tracking-wider">
              Meet link
            </label>
            <div className="flex items-center gap-2 bg-hover border border-line rounded-lg px-3 py-2 focus-within:border-accent transition-colors">
              <Link size={13} strokeWidth={1.8} className="text-dim shrink-0" />
              <input
                type="url"
                placeholder="Paste your Meet link here…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-hi placeholder:text-dim outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Message preview */}
          {link.trim() && (
            <div className="bg-elevated border border-line rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-medium text-dim uppercase tracking-wider mb-1">Message preview</p>
              <p className="text-[12px] text-lo leading-relaxed">{message}</p>
            </div>
          )}

          {/* Destinations */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-lo uppercase tracking-wider">Send to</p>

            {visibleDestinations.length === 0 ? (
              <p className="text-[12px] text-dim py-2">
                No destinations configured. Add some in the Share page.
              </p>
            ) : (
              <div className="space-y-1">
                {visibleDestinations.map((dest) => {
                  const isSent = sent === dest.id;
                  const isSending = sending === dest.id;
                  return (
                    <button
                      key={dest.id}
                      onClick={() => handleShare(dest.id)}
                      disabled={!!sending}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-line bg-hover hover:border-accent/50 hover:bg-elevated transition-colors disabled:opacity-60 text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: dest.color + "22", color: dest.color }}
                      >
                        {isSent
                          ? <CheckCircle2 size={13} strokeWidth={2} />
                          : kindIcon(dest.kind)
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-hi truncate">{dest.name}</p>
                        <p className="text-[10px] text-dim truncate">{kindLabel(dest.kind)}</p>
                      </div>
                      {isSending && (
                        <span className="text-[10px] text-dim animate-pulse">Opening…</span>
                      )}
                      {isSent && (
                        <span className="text-[10px] text-emerald-400">Done!</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Just copy fallback */}
            <button
              onClick={handleJustCopy}
              disabled={!!sending}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-line hover:border-accent/40 hover:bg-elevated transition-colors disabled:opacity-60 text-left"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-elevated text-dim">
                {sent === "__copy__"
                  ? <CheckCircle2 size={13} strokeWidth={2} className="text-emerald-400" />
                  : <Copy size={13} strokeWidth={1.8} />
                }
              </div>
              <div>
                <p className="text-[12px] font-medium text-lo">Just copy</p>
                <p className="text-[10px] text-dim">Copy the message to clipboard</p>
              </div>
            </button>
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
