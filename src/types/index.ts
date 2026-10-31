import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export type Icon = ComponentType<LucideProps>;

export interface NavItem {
  id: string;
  label: string;
  icon: Icon;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  shortcut: string;
  iconColor: string;
  iconBg: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tech: string[];
  dotColor: string;
  lastOpened: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  target: string;
  time: string;
  icon: Icon;
}

export type ProjectCategory = "coding" | "university" | "personal" | "other";

export interface StoredProject {
  id: string;
  name: string;
  description: string;
  folderPath: string;
  category: ProjectCategory;
  color: string;
  createdAt: string;
}

// ── Unified launcher model ────────────────────────────────────────────────────

export type ItemType = "app" | "project" | "file" | "folder" | "website";

export interface LauncherItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  /** Filesystem path for app/project/file/folder; URL for website. */
  target: string;
  color: string;
  createdAt: string;
  projectCategory?: string;
}

// ── Workspace model ───────────────────────────────────────────────────────────

export type WorkspaceIconName =
  | "code2" | "book-open" | "zap" | "globe" | "layers"
  | "briefcase" | "star" | "coffee" | "music" | "target"
  | "heart" | "terminal";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: WorkspaceIconName;
  color: string;
  /** Ordered references to LauncherItem.id — no data is duplicated. */
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
}
