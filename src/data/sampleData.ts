import {
  LayoutDashboard,
  FolderOpen,
  Layers,
  Activity,
  Settings,
  Terminal,
  BookOpen,
  Zap,
  Play,
  Share2,
} from "lucide-react";
import type { NavItem, QuickAction, Project, ActivityEntry } from "../types";

export const navItems: NavItem[] = [
  { id: "overview",     label: "Overview",     icon: LayoutDashboard },
  { id: "launcher",     label: "Launcher",     icon: FolderOpen },
  { id: "workspaces",   label: "Workspaces",   icon: Layers },
  { id: "share",        label: "Share",        icon: Share2 },
  { id: "activity",     label: "Activity",     icon: Activity },
];

export const settingsNavItem: NavItem = {
  id: "settings",
  label: "Settings",
  icon: Settings,
};

export const quickActions: QuickAction[] = [
  {
    id: "coding",
    title: "Coding Mode",
    description: "VS Code · Terminal · GitHub",
    icon: Terminal,
    shortcut: "⌘1",
    iconColor: "#6366F1",
    iconBg: "rgba(99,102,241,0.14)",
  },
  {
    id: "study",
    title: "Study Mode",
    description: "Notion · Safari · Focus",
    icon: BookOpen,
    shortcut: "⌘2",
    iconColor: "#22C55E",
    iconBg: "rgba(34,197,94,0.14)",
  },
  {
    id: "focus",
    title: "Focus Mode",
    description: "DND · Music · Timer",
    icon: Zap,
    shortcut: "⌘3",
    iconColor: "#F59E0B",
    iconBg: "rgba(245,158,11,0.14)",
  },
];

export const recentProjects: Project[] = [
  {
    id: "flow",
    name: "Flow",
    description: "Personal desktop automation app",
    tech: ["Rust", "TypeScript"],
    dotColor: "#6366F1",
    lastOpened: "Now",
  },
  {
    id: "website",
    name: "Personal Website",
    description: "Portfolio and blog",
    tech: ["TypeScript", "React"],
    dotColor: "#22C55E",
    lastOpened: "2h ago",
  },
  {
    id: "cs-notes",
    name: "CS Notes",
    description: "University lecture notes and summaries",
    tech: ["Markdown"],
    dotColor: "#F59E0B",
    lastOpened: "Yesterday",
  },
  {
    id: "algorithms",
    name: "Algorithms",
    description: "LeetCode solutions and data structures",
    tech: ["Python"],
    dotColor: "#3B82F6",
    lastOpened: "3 days ago",
  },
];

export const recentActivity: ActivityEntry[] = [
  {
    id: "1",
    action: "Opened workspace",
    target: "Flow App",
    time: "Just now",
    icon: Play,
  },
  {
    id: "2",
    action: "Launched",
    target: "Focus Mode",
    time: "2 hours ago",
    icon: Zap,
  },
  {
    id: "3",
    action: "Switched to",
    target: "Coding Mode",
    time: "Yesterday",
    icon: Terminal,
  },
  {
    id: "4",
    action: "Created project",
    target: "CS Notes",
    time: "3 days ago",
    icon: FolderOpen,
  },
];
