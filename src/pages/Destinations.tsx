import { useState } from "react";
import { Plus, Pencil, Trash2, MessageCircle, Users, Copy, Share2 } from "lucide-react";
import { useDestinations } from "../hooks/useDestinations";
import { DestinationModal } from "../components/DestinationModal";
import type { ShareDestination } from "../types";

function kindIcon(kind: string) {
  if (kind === "whatsapp-group")   return <Users  size={14} strokeWidth={1.8} />;
  if (kind === "copy")             return <Copy   size={14} strokeWidth={1.8} />;
  return                                  <MessageCircle size={14} strokeWidth={1.8} />;
}

function kindLabel(kind: string) {
  if (kind === "whatsapp-group")   return "WhatsApp Group";
  if (kind === "copy")             return "Just Copy";
  return                                  "WhatsApp Contact";
}

type Modal = { type: "add" } | { type: "edit"; destination: ShareDestination } | null;

export function Destinations() {
  const { destinations, loading, addDestination, updateDestination, deleteDestination } =
    useDestinations();
  const [modal, setModal] = useState<Modal>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function handleSave(d: ShareDestination) {
    if (modal?.type === "edit") {
      await updateDestination(d);
    } else {
      await addDestination(d);
    }
  }

  async function handleDelete(id: string) {
    await deleteDestination(id);
    setDeleteConfirm(null);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
        <div>
          <h1 className="text-[16px] font-semibold text-hi tracking-tight">Share Destinations</h1>
          <p className="text-[12px] text-dim mt-0.5">
            Places to send links after a share action runs.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={12} strokeWidth={2.5} />
          Add Destination
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {loading ? (
            <p className="text-[13px] text-dim">Loading…</p>
          ) : destinations.length === 0 ? (
            <div className="bg-card border border-line rounded-xl flex flex-col items-center justify-center py-14">
              <Share2 size={28} strokeWidth={1.4} className="text-dim mb-3" />
              <p className="text-[13px] text-lo font-medium">No destinations yet</p>
              <p className="text-[12px] text-dim mt-1 mb-4 text-center max-w-xs">
                Add a WhatsApp contact or group to quickly share links after a workspace starts.
              </p>
              <button
                onClick={() => setModal({ type: "add" })}
                className="text-[12px] text-accent hover:opacity-80 transition-opacity"
              >
                Add your first destination →
              </button>
            </div>
          ) : (
            <div className="bg-card border border-line rounded-xl overflow-hidden">
              {destinations.map((dest, idx) => (
                <div
                  key={dest.id}
                  className={`flex items-center gap-3 px-4 py-3 group ${
                    idx < destinations.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  {/* Color + icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: dest.color + "22", color: dest.color }}
                  >
                    {kindIcon(dest.kind)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-hi font-medium truncate">{dest.name}</p>
                    <p className="text-[11px] text-dim truncate">
                      {kindLabel(dest.kind)}
                      {dest.target ? ` · ${dest.target}` : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setModal({ type: "edit", destination: dest })}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-dim hover:text-lo hover:bg-hover transition-colors"
                      title="Edit"
                    >
                      <Pencil size={12} strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(dest.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info callout */}
          {destinations.length > 0 && (
            <div className="mt-4 bg-card border border-line rounded-xl px-4 py-3">
              <p className="text-[11px] text-dim leading-relaxed">
                <span className="text-lo font-medium">How it works:</span> When a workspace
                has a share action configured, Flow opens a share picker after the workspace
                starts. Pick a destination and Flow opens the right app with your message
                ready — you press Send.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <DestinationModal
          destination={modal.type === "edit" ? modal.destination : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border border-line rounded-2xl w-[360px] shadow-2xl px-5 py-5">
            <h3 className="text-[14px] font-semibold text-hi mb-1">Delete destination?</h3>
            <p className="text-[12px] text-lo mb-4">
              This will also remove it from any workspace share actions that reference it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-[12px] text-lo hover:text-hi rounded-lg hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-[12px] font-medium bg-red-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
