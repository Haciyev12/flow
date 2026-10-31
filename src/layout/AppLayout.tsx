import type { ReactNode } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

const PAGE_TITLES: Record<string, string> = {
  overview: "Overview",
  launcher: "Launcher",
  workspaces: "Workspaces",
  activity: "Activity",
  settings: "Settings",
};

interface AppLayoutProps {
  activePage: string;
  onNavigate: (pageId: string) => void;
  children: ReactNode;
}

export function AppLayout({ activePage, onNavigate, children }: AppLayoutProps) {
  return (
    <div className="flex h-full bg-app">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title={PAGE_TITLES[activePage] ?? "Flow"} />
        {children}
      </div>
    </div>
  );
}
