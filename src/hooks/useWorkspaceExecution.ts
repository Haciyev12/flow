import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  Workspace,
  LauncherItem,
  WorkspaceExecutionState,
  ItemExecutionState,
  ExecutionItemStatus,
} from "../types";
import { DEFAULT_ITEM_SETTINGS } from "../types";

function applyItemStatus(
  state: WorkspaceExecutionState,
  id: string,
  status: ExecutionItemStatus,
  currentIndex: number,
  error?: string
): WorkspaceExecutionState {
  return {
    ...state,
    currentIndex,
    items: state.items.map((it) =>
      it.id === id ? { ...it, status, error } : it
    ),
  };
}

function applyBatchStatus(
  state: WorkspaceExecutionState,
  ids: string[],
  status: ExecutionItemStatus,
  error?: string
): WorkspaceExecutionState {
  const idSet = new Set(ids);
  return {
    ...state,
    // Keep currentIndex at -1 during batch; individual spinners show progress.
    currentIndex: -1,
    items: state.items.map((it) =>
      idSet.has(it.id) ? { ...it, status, error } : it
    ),
  };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useWorkspaceExecution() {
  const [state, setState] = useState<WorkspaceExecutionState | null>(null);
  const cancelledRef = useRef(false);
  const confirmResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const respondConfirm = useCallback((confirmed: boolean) => {
    confirmResolveRef.current?.(confirmed);
    confirmResolveRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    confirmResolveRef.current?.(false);
    confirmResolveRef.current = null;
    setState((s) => (s ? { ...s, status: "cancelled" } : null));
  }, []);

  const dismiss = useCallback(() => {
    setState(null);
  }, []);

  const start = useCallback(
    async (workspace: Workspace, resolvedItems: (LauncherItem | null)[]) => {
      cancelledRef.current = false;

      const execItems: ItemExecutionState[] = workspace.itemIds.map((id) => ({
        id,
        status: "pending",
      }));

      setState({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceColor: workspace.color,
        workspaceIcon: workspace.icon,
        status: "running",
        items: execItems,
        currentIndex: -1,
      });

      // Record this workspace as recently used so Activity and the palette
      // recents list stay up to date regardless of where Start was clicked.
      invoke("record_recent", {
        id: workspace.id,
        kind: "workspace",
        usedAt: new Date().toISOString(),
      }).catch(() => {});

      let anyFailed = false;

      // ── Phase 1: batch all batchable website items ─────────────────────────
      //
      // Website items that have autoExecute=true and confirmBefore=false are
      // grouped and opened together in one new Brave window. This guarantees a
      // single clean window per workspace rather than reusing the existing one.
      //
      // Items with confirmBefore=true fall through to the per-item loop below
      // so the user can approve or skip them individually.

      const batchIds: string[] = [];
      const batchUrls: string[] = [];

      for (let i = 0; i < workspace.itemIds.length; i++) {
        const id = workspace.itemIds[i];
        const item = resolvedItems[i] ?? null;
        const settings = workspace.itemSettings?.[id] ?? DEFAULT_ITEM_SETTINGS;

        if (
          item?.type === "website" &&
          settings.autoExecute &&
          !settings.confirmBefore
        ) {
          batchIds.push(id);
          batchUrls.push(item.target);
        }
      }

      if (batchIds.length > 0) {
        // Show all website items as running simultaneously.
        setState((s) => (s ? applyBatchStatus(s, batchIds, "running") : null));

        try {
          await invoke("open_urls_in_browser_window", { urls: batchUrls });
          setState((s) =>
            s ? applyBatchStatus(s, batchIds, "success") : null
          );
        } catch (err) {
          anyFailed = true;
          setState((s) =>
            s ? applyBatchStatus(s, batchIds, "failed", String(err)) : null
          );
          // Check whether the first non-batched item can continue on failure.
          // We honour the first website item's continueOnFailure setting for
          // the batch as a whole.
          const firstBatchId = batchIds[0];
          const firstSettings =
            workspace.itemSettings?.[firstBatchId] ?? DEFAULT_ITEM_SETTINGS;
          if (!firstSettings.continueOnFailure) {
            setState((s) =>
              s ? { ...s, status: "failed", currentIndex: -1 } : null
            );
            return;
          }
        }

        await wait(400);
      }

      // ── Phase 2: execute every non-batched item in original order ──────────

      const batchedSet = new Set(batchIds);

      for (let i = 0; i < workspace.itemIds.length; i++) {
        if (cancelledRef.current) break;

        const id = workspace.itemIds[i];
        if (batchedSet.has(id)) continue; // already handled above

        const item = resolvedItems[i] ?? null;
        const settings = workspace.itemSettings?.[id] ?? DEFAULT_ITEM_SETTINGS;

        if (!settings.autoExecute) {
          setState((s) =>
            s ? applyItemStatus(s, id, "skipped", i) : null
          );
          continue;
        }

        if (!item) {
          setState((s) =>
            s ? applyItemStatus(s, id, "skipped", i, "No longer in Library") : null
          );
          continue;
        }

        setState((s) => (s ? applyItemStatus(s, id, "running", i) : null));

        // Confirmation gate (applies to all item types including websites with
        // confirmBefore=true that were excluded from the batch).
        if (settings.confirmBefore) {
          const confirmed = await new Promise<boolean>((resolve) => {
            confirmResolveRef.current = resolve;
            setState((s) =>
              s ? { ...s, status: "paused_confirm", confirmItem: item } : null
            );
          });
          setState((s) =>
            s ? { ...s, status: "running", confirmItem: undefined } : null
          );
          if (!confirmed || cancelledRef.current) {
            setState((s) =>
              s ? applyItemStatus(s, id, "skipped", i) : null
            );
            continue;
          }
        }

        // For websites reaching here they have confirmBefore=true (and the user
        // confirmed) — open them individually via the standard launcher so the
        // user gets exactly the behaviour they explicitly confirmed.
        try {
          await invoke("launch_item", {
            itemType: item.type,
            target: item.target,
          });
          setState((s) => (s ? applyItemStatus(s, id, "success", i) : null));
          await wait(600);
        } catch (err) {
          anyFailed = true;
          setState((s) =>
            s ? applyItemStatus(s, id, "failed", i, String(err)) : null
          );
          if (!settings.continueOnFailure) break;
        }
      }

      if (!cancelledRef.current) {
        setState((s) =>
          s
            ? { ...s, status: anyFailed ? "failed" : "completed", currentIndex: -1 }
            : null
        );
      }
    },
    []
  );

  return { state, start, stop, dismiss, respondConfirm };
}
