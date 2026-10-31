import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { StoredProject } from "../types";

export function useProjects() {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<StoredProject[]>("load_projects")
      .then(setProjects)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Writes to disk first; only updates state if the write succeeds.
  const persist = useCallback(async (next: StoredProject[]) => {
    await invoke("save_projects", { projects: next });
    setProjects(next);
  }, []);

  const addProject = useCallback(
    (project: StoredProject) => persist([...projects, project]),
    [projects, persist]
  );

  const updateProject = useCallback(
    (updated: StoredProject) =>
      persist(projects.map((p) => (p.id === updated.id ? updated : p))),
    [projects, persist]
  );

  const deleteProject = useCallback(
    (id: string) => persist(projects.filter((p) => p.id !== id)),
    [projects, persist]
  );

  return { projects, loading, error, addProject, updateProject, deleteProject };
}
