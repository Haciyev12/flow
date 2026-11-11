import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { AppLayout } from "./layout/AppLayout";
import { Overview } from "./pages/Overview";
import { Launcher } from "./pages/Launcher";
import { Workspaces } from "./pages/Workspaces";
import { Destinations } from "./pages/Destinations";
import { Activity } from "./pages/Activity";
import { Settings } from "./pages/Settings";
import { SharePicker } from "./components/SharePicker";
import type { ShareDestination } from "./types";

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [globalSharePicker, setGlobalSharePicker] = useState(false);
  const [destinations, setDestinations] = useState<ShareDestination[]>([]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("navigate", (event) => {
      setActivePage(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
    // Internal navigation events dispatched by child components
    const handleInternalNav = (e: Event) => {
      setActivePage((e as CustomEvent<string>).detail);
    };
    document.addEventListener("flow-navigate", handleInternalNav);

    // Show share picker from the command palette
    let unlistenShare: (() => void) | undefined;
    listen<null>("show-share-picker", async () => {
      // Show the main window and load destinations for the picker
      const dests = await invoke<ShareDestination[]>("load_destinations").catch(() => [] as ShareDestination[]);
      setDestinations(dests);
      setGlobalSharePicker(true);
    }).then((fn) => { unlistenShare = fn; });

    return () => {
      unlisten?.();
      document.removeEventListener("flow-navigate", handleInternalNav);
      unlistenShare?.();
    };
  }, []);

  function renderPage() {
    switch (activePage) {
      case "overview":   return <Overview />;
      case "launcher":   return <Launcher />;
      case "workspaces":   return <Workspaces />;
      case "share":        return <Destinations />;
      case "activity":     return <Activity />;
      case "settings":     return <Settings />;
      default:           return <Overview />;
    }
  }

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
      {globalSharePicker && (
        <SharePicker
          shareAction={{ actionType: "google-meet-new", destinationIds: [], messageTemplate: "Join my session: {link}" }}
          workspaceName=""
          destinations={destinations}
          onDismiss={() => setGlobalSharePicker(false)}
        />
      )}
    </AppLayout>
  );
}

export default App;
