import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ShareDestination } from "../types";

export function useDestinations() {
  const [destinations, setDestinations] = useState<ShareDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<ShareDestination[]>("load_destinations")
      .then(setDestinations)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: ShareDestination[]) => {
    await invoke("save_destinations", { destinations: next });
    setDestinations(next);
  }, []);

  const addDestination = useCallback(
    (d: ShareDestination) => persist([...destinations, d]),
    [destinations, persist]
  );

  const updateDestination = useCallback(
    (updated: ShareDestination) =>
      persist(destinations.map((d) => (d.id === updated.id ? updated : d))),
    [destinations, persist]
  );

  const deleteDestination = useCallback(
    (id: string) => persist(destinations.filter((d) => d.id !== id)),
    [destinations, persist]
  );

  return { destinations, loading, error, addDestination, updateDestination, deleteDestination };
}
