import { useState } from "react";
import { AppLayout } from "./layout/AppLayout";
import { Overview } from "./pages/Overview";
import { Launcher } from "./pages/Launcher";
import { Workspaces } from "./pages/Workspaces";
import { Activity } from "./pages/Activity";
import { Settings } from "./pages/Settings";

function App() {
  const [activePage, setActivePage] = useState("overview");

  function renderPage() {
    switch (activePage) {
      case "overview":   return <Overview />;
      case "launcher":   return <Launcher />;
      case "workspaces": return <Workspaces />;
      case "activity":   return <Activity />;
      case "settings":   return <Settings />;
      default:           return <Overview />;
    }
  }

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
