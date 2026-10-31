import { useState } from "react";
import { AppLayout } from "./layout/AppLayout";
import { Overview } from "./pages/Overview";
import { Launcher } from "./pages/Launcher";
import { Workspaces } from "./pages/Workspaces";
import { Placeholder } from "./pages/Placeholder";

const PLACEHOLDER_TITLES: Record<string, string> = {
  activity: "Activity",
  settings: "Settings",
};

function App() {
  const [activePage, setActivePage] = useState("overview");

  function renderPage() {
    if (activePage === "overview") return <Overview />;
    if (activePage === "launcher") return <Launcher />;
    if (activePage === "workspaces") return <Workspaces />;
    return <Placeholder title={PLACEHOLDER_TITLES[activePage] ?? activePage} />;
  }

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
