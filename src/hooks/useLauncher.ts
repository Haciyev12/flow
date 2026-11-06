import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { LauncherItem } from "../types";

export function useLauncher() {
  const [items, setItems] = useState<LauncherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<LauncherItem[]>("load_items")
      .then(setItems)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Writes to disk first; only updates state on success.
  const persist = useCallback(async (next: LauncherItem[]) => {
    await invoke("save_items", { items: next });
    setItems(next);
  }, []);

  const addItem = useCallback(
    (item: LauncherItem) => persist([...items, item]),
    [items, persist]
  );

  const updateItem = useCallback(
    (updated: LauncherItem) =>
      persist(items.map((i) => (i.id === updated.id ? updated : i))),
    [items, persist]
  );

  const deleteItem = useCallback(
    (id: string) => persist(items.filter((i) => i.id !== id)),
    [items, persist]
  );

  const toggleFavorite = useCallback(
    (id: string) =>
      persist(items.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i))),
    [items, persist]
  );

  return { items, loading, error, addItem, updateItem, deleteItem, toggleFavorite };
}
