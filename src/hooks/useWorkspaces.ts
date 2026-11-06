import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Workspace } from "../types";

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<Workspace[]>("load_workspaces")
      .then(setWorkspaces)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: Workspace[]) => {
    await invoke("save_workspaces", { workspaces: next });
    setWorkspaces(next);
  }, []);

  const addWorkspace = useCallback(
    (ws: Workspace) => persist([...workspaces, ws]),
    [workspaces, persist]
  );

  const updateWorkspace = useCallback(
    (updated: Workspace) =>
      persist(workspaces.map((w) => (w.id === updated.id ? updated : w))),
    [workspaces, persist]
  );

  const deleteWorkspace = useCallback(
    (id: string) => persist(workspaces.filter((w) => w.id !== id)),
    [workspaces, persist]
  );

  const reorderWorkspaces = useCallback(
    (reordered: Workspace[]) => persist(reordered),
    [persist]
  );

  return { workspaces, loading, error, addWorkspace, updateWorkspace, deleteWorkspace, reorderWorkspaces };
}
