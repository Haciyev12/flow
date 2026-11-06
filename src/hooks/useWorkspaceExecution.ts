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

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useWorkspaceExecution() {
  const [state, setState] = useState<WorkspaceExecutionState | null>(null);
  const cancelledRef = useRef(false);
  const confirmResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  // Called from the overlay when user answers a confirm prompt.
  const respondConfirm = useCallback((confirmed: boolean) => {
    confirmResolveRef.current?.(confirmed);
    confirmResolveRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    // Unblock any pending confirm so the loop can exit cleanly.
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

      const initial: WorkspaceExecutionState = {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceColor: workspace.color,
        workspaceIcon: workspace.icon,
        status: "running",
        items: execItems,
        currentIndex: -1,
      };
      setState(initial);

      let anyFailed = false;

      for (let i = 0; i < workspace.itemIds.length; i++) {
        if (cancelledRef.current) break;

        const id = workspace.itemIds[i];
        const item = resolvedItems[i] ?? null;
        const settings = workspace.itemSettings?.[id] ?? DEFAULT_ITEM_SETTINGS;

        // Skip items opted out of auto-execute
        if (!settings.autoExecute) {
          setState((s) =>
            s ? applyItemStatus(s, id, "skipped", i) : null
          );
          continue;
        }

        // Skip items deleted from the Library
        if (!item) {
          setState((s) =>
            s
              ? applyItemStatus(s, id, "skipped", i, "No longer in Library")
              : null
          );
          continue;
        }

        // Mark as running
        setState((s) =>
          s ? applyItemStatus(s, id, "running", i) : null
        );

        // Confirmation gate
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

        // Execute
        try {
          await invoke("launch_item", {
            itemType: item.type,
            target: item.target,
          });
          setState((s) =>
            s ? applyItemStatus(s, id, "success", i) : null
          );
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
