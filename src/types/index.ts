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
  favorite?: boolean;
}

// ── Workspace model ───────────────────────────────────────────────────────────

export type WorkspaceIconName =
  | "code2" | "book-open" | "zap" | "globe" | "layers"
  | "briefcase" | "star" | "coffee" | "music" | "target"
  | "heart" | "terminal";

export interface WorkspaceItemSettings {
  autoExecute: boolean;
  confirmBefore: boolean;
  continueOnFailure: boolean;
}

export const DEFAULT_ITEM_SETTINGS: WorkspaceItemSettings = {
  autoExecute: true,
  confirmBefore: false,
  continueOnFailure: true,
};

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: WorkspaceIconName;
  color: string;
  /** Ordered references to LauncherItem.id — no data is duplicated. */
  itemIds: string[];
  /** Per-item execution settings keyed by LauncherItem.id. */
  itemSettings?: Record<string, WorkspaceItemSettings>;
  /** How websites are opened when this workspace is launched. Defaults to 'new-window'. */
  browserOpenMode?: 'new-window' | 'active-session';
  /** Optional: share a link after this workspace starts. */
  shareAction?: WorkspaceShareAction;
  createdAt: string;
  updatedAt: string;
}

// ── Share destinations ────────────────────────────────────────────────────────

export type DestinationKind = 'whatsapp-contact' | 'whatsapp-group' | 'copy';

export interface ShareDestination {
  id: string;
  /** Display name, e.g. "Study Group", "John (WhatsApp)" */
  name: string;
  kind: DestinationKind;
  /** Phone number (contact) or invite URL (group). Absent for 'copy'. */
  target?: string;
  color: string;
  createdAt: string;
}

export interface WorkspaceShareAction {
  /** Extensible: 'google-meet-new' for now; Zoom etc. added later. */
  actionType: 'google-meet-new';
  /** IDs of destinations to show. Empty = show all saved destinations. */
  destinationIds: string[];
  /** Template with {link} and {workspace} variables. */
  messageTemplate: string;
}

// ── Execution engine ──────────────────────────────────────────────────────────

export type ExecutionItemStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface ItemExecutionState {
  id: string;
  status: ExecutionItemStatus;
  error?: string;
}

export type WorkspaceExecutionStatus =
  | "running"
  | "paused_confirm"
  | "completed"
  | "cancelled"
  | "failed";

export interface WorkspaceExecutionState {
  workspaceId: string;
  workspaceName: string;
  workspaceColor: string;
  workspaceIcon: WorkspaceIconName;
  status: WorkspaceExecutionStatus;
  items: ItemExecutionState[];
  currentIndex: number;
  confirmItem?: LauncherItem;
}
