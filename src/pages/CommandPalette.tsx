import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Search, AppWindow, FolderOpen, FileText, Folder, Globe, Layers,
  Code2, BookOpen, Zap, Target, Briefcase, Star, Coffee, Music,
  Heart, Terminal, ArrowRight,
} from "lucide-react";
import type { LauncherItem, Workspace, WorkspaceIconName, ItemType } from "../types";
import { DEFAULT_ITEM_SETTINGS } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentEntry {
  id: string;
  kind: string;
  usedAt: string;
}

interface PaletteEntry {
  id: string;
  kind: "item" | "workspace";
  name: string;
  subtitle: string;
  itemType: ItemType | "workspace";
  color: string;
  target?: string;
  itemIds?: string[];
  wsIcon?: WorkspaceIconName;
  workspace?: Workspace;
}

// ── Icon registries ───────────────────────────────────────────────────────────

const ITEM_ICONS: Record<ItemType, React.ReactNode> = {
  app:     <AppWindow  size={15} strokeWidth={1.8} />,
  project: <FolderOpen size={15} strokeWidth={1.8} />,
  file:    <FileText   size={15} strokeWidth={1.8} />,
  folder:  <Folder     size={15} strokeWidth={1.8} />,
  website: <Globe      size={15} strokeWidth={1.8} />,
};

const WS_ICONS: Record<WorkspaceIconName, React.ReactNode> = {
  "code2":     <Code2     size={15} strokeWidth={1.8} />,
  "book-open": <BookOpen  size={15} strokeWidth={1.8} />,
  "zap":       <Zap       size={15} strokeWidth={1.8} />,
  "globe":     <Globe     size={15} strokeWidth={1.8} />,
  "layers":    <Layers    size={15} strokeWidth={1.8} />,
  "briefcase": <Briefcase size={15} strokeWidth={1.8} />,
  "star":      <Star      size={15} strokeWidth={1.8} />,
  "coffee":    <Coffee    size={15} strokeWidth={1.8} />,
  "music":     <Music     size={15} strokeWidth={1.8} />,
  "target":    <Target    size={15} strokeWidth={1.8} />,
  "heart":     <Heart     size={15} strokeWidth={1.8} />,
  "terminal":  <Terminal  size={15} strokeWidth={1.8} />,
};

const ACTION_LABEL: Record<ItemType | "workspace", string> = {
  app:       "Launch",
  project:   "Open",
  file:      "Open",
  folder:    "Finder",
  website:   "Browse",
  workspace: "Start",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexBg(color: string) { return color + "22"; }

function shortenPath(p: string) {
  return p.replace(/^\/Users\/[^/]+/, "~");
}

function scoreEntry(entry: PaletteEntry, q: string): number {
  const name = entry.name.toLowerCase();
  const sub  = entry.subtitle.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (sub.includes(q)) return 30;
  // Fuzzy: check all query chars appear in order
  let j = 0;
  for (const ch of name) {
    if (ch === q[j]) j++;
    if (j === q.length) return 20;
  }
  return 0;
}

// ── Result row ────────────────────────────────────────────────────────────────

interface RowProps {
  entry: PaletteEntry;
  selected: boolean;
  isRecent: boolean;
  isFavorite: boolean;
  onPointerEnter: () => void;
  onClick: () => void;
}

function ResultRow({ entry, selected, isRecent, isFavorite, onPointerEnter, onClick }: RowProps) {
  const icon = entry.kind === "workspace"
    ? WS_ICONS[entry.wsIcon ?? "layers"]
    : ITEM_ICONS[entry.itemType as ItemType];

  const badge = entry.kind === "workspace" ? "workspace" : entry.itemType;
  const action = ACTION_LABEL[entry.itemType];

  return (
    <div
      onPointerEnter={onPointerEnter}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-2.5 cursor-default transition-colors duration-75
        ${selected ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}
      `}
    >
      {/* Icon */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: hexBg(entry.color), color: entry.color }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-hi truncate">{entry.name}</span>
          <span
            className="text-[9px] px-1.5 py-[1px] rounded font-semibold uppercase tracking-wide shrink-0"
            style={{ background: hexBg(entry.color), color: entry.color }}
          >
            {badge}
          </span>
          {isFavorite && (
            <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
          )}
          {isRecent && !isFavorite && (
            <span className="text-[9px] text-dim shrink-0">recent</span>
          )}
        </div>
        {entry.subtitle && (
          <p className="text-[11px] text-dim truncate mt-0.5">{entry.subtitle}</p>
        )}
      </div>

      {/* Action hint — visible when selected */}
      {selected && (
        <div className="flex items-center gap-1.5 shrink-0 text-dim">
          <span className="text-[11px]">{action}</span>
          <ArrowRight size={11} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [query, setQuery]       = useState("");
  const [items, setItems]       = useState<LauncherItem[]>([]);
  const [workspaces, setWS]     = useState<Workspace[]>([]);
  const [recents, setRecents]   = useState<RecentEntry[]>([]);
  const [selectedIdx, setSel]   = useState(0);
  const [busy, setBusy]         = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    const [its, wss, recs] = await Promise.all([
      invoke<LauncherItem[]>("load_items").catch((): LauncherItem[] => []),
      invoke<Workspace[]>("load_workspaces").catch((): Workspace[] => []),
      invoke<RecentEntry[]>("load_recents").catch((): RecentEntry[] => []),
    ]);
    setItems(its);
    setWS(wss);
    setRecents(recs);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Reload data, clear query, focus input every time the window gains focus.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    listen<null>("tauri://focus", () => {
      reload();
      setQuery("");
      setSel(0);
      setBusy(false);
      // Small delay so the window is fully visible before focusing.
      setTimeout(() => inputRef.current?.focus(), 30);
    }).then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, [reload]);

  // Hide when window loses focus.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    listen<null>("tauri://blur", () => {
      invoke("hide_palette").catch(() => {});
    }).then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, []);

  // ── Build entries ───────────────────────────────────────────────────────────

  const allEntries = useMemo((): PaletteEntry[] => {
    const itemEntries: PaletteEntry[] = items.map((item) => ({
      id: item.id,
      kind: "item",
      name: item.name,
      subtitle: item.description
        || (item.type === "website" ? item.target : shortenPath(item.target)),
      itemType: item.type,
      color: item.color,
      target: item.target,
    }));

    const wsEntries: PaletteEntry[] = workspaces.map((ws) => ({
      id: ws.id,
      kind: "workspace",
      name: ws.name,
      subtitle: ws.description || `${ws.itemIds.length} item${ws.itemIds.length !== 1 ? "s" : ""}`,
      itemType: "workspace" as const,
      color: ws.color,
      wsIcon: ws.icon,
      itemIds: ws.itemIds,
      workspace: ws,
    }));

    return [...itemEntries, ...wsEntries];
  }, [items, workspaces]);

  // ── Filter + rank ───────────────────────────────────────────────────────────

  const recentIds = useMemo(() => new Set(recents.map((r) => r.id)), [recents]);

  const favoriteIds = useMemo(
    () => new Set(items.filter((i) => i.favorite).map((i) => i.id)),
    [items]
  );

  const { results, recentSet } = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // No query: favorites first, then recents, then remaining (12 total).
      const favEntries = allEntries
        .filter((e) => favoriteIds.has(e.id))
        .slice(0, 4);
      const favIds = new Set(favEntries.map((e) => e.id));

      const recentEntries = recents
        .map((r) => allEntries.find((e) => e.id === r.id))
        .filter((e): e is PaletteEntry => !!e && !favIds.has(e.id))
        .slice(0, 4);
      const recentIdsLocal = new Set(recentEntries.map((e) => e.id));

      const usedIds = new Set([...favIds, ...recentIdsLocal]);
      const rest = allEntries.filter((e) => !usedIds.has(e.id)).slice(0, 12 - favEntries.length - recentEntries.length);

      return {
        results: [...favEntries, ...recentEntries, ...rest],
        recentSet: recentIdsLocal,
      };
    }

    // Query: score and rank. Boost favorites and recents.
    const recentRank = new Map(recents.map((r, i) => [r.id, 10 - i]));
    const scored = allEntries
      .map((entry) => {
        const base    = scoreEntry(entry, q);
        const rBoost  = base > 0 ? (recentRank.get(entry.id) ?? 0) * 0.5 : 0;
        const fBoost  = base > 0 && favoriteIds.has(entry.id) ? 8 : 0;
        return { entry, score: base + rBoost + fBoost };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ entry }) => entry);

    return { results: scored, recentSet: recentIds };
  }, [allEntries, recents, recentIds, favoriteIds, query]);

  // Reset selection when results change.
  useEffect(() => { setSel(0); }, [results.length, query]);

  // Scroll selected item into view.
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  // ── Execution ───────────────────────────────────────────────────────────────

  const execute = useCallback(async (entry: PaletteEntry) => {
    if (busy) return;
    setBusy(true);
    try {
      if (entry.kind === "item" && entry.target) {
        await invoke("launch_item", { itemType: entry.itemType, target: entry.target });
      } else if (entry.kind === "workspace" && entry.workspace) {
        const ws = entry.workspace;

        // Collect website URLs for the browser batch, non-websites for
        // individual launch. Mirrors the logic in useWorkspaceExecution.
        const websiteUrls: string[] = [];
        const otherItems: LauncherItem[] = [];

        for (const id of ws.itemIds) {
          const settings = ws.itemSettings?.[id] ?? DEFAULT_ITEM_SETTINGS;
          if (!settings.autoExecute) continue;
          const item = items.find((i) => i.id === id);
          if (!item) continue;
          if (item.type === "website" && !settings.confirmBefore) {
            websiteUrls.push(item.target);
          } else {
            otherItems.push(item);
          }
        }

        // Open all websites in one new Brave window.
        if (websiteUrls.length > 0) {
          await invoke("open_urls_in_browser_window", { urls: websiteUrls }).catch(() => {});
        }

        // Launch non-website items individually.
        for (const item of otherItems) {
          await invoke("launch_item", { itemType: item.type, target: item.target }).catch(() => {});
        }
      }
      await invoke("record_recent", {
        id: entry.id,
        kind: entry.kind,
        usedAt: new Date().toISOString(),
      }).catch(() => {});
      await invoke("hide_palette");
    } catch {
      setBusy(false);
    }
  }, [busy, items]);

  // ── Keyboard handler ────────────────────────────────────────────────────────

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSel((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSel((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIdx]) execute(results[selectedIdx]);
        break;
      case "Escape":
        e.preventDefault();
        invoke("hide_palette").catch(() => {});
        break;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const showSectionLabel = !query.trim() && results.length > 0 &&
    (favoriteIds.size > 0 || recents.length > 0);
  const sectionLabel = favoriteIds.size > 0 ? "Favorites & Recent" : "Recent";

  return (
    <div className="h-screen w-screen flex items-start justify-center pt-[80px]">
      <div
        className="w-full mx-4 rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "rgba(14, 14, 18, 0.97)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 32px 96px rgba(0,0,0,0.7), 0 2px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
          maxHeight: "420px",
        }}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Search
            size={16}
            strokeWidth={2}
            className={busy ? "text-accent animate-pulse" : "text-dim"}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search apps, files, workspaces…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            autoFocus
            className="flex-1 bg-transparent text-[14px] text-hi placeholder:text-dim/60 outline-none disabled:opacity-50"
          />
          {query && !busy && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
              className="text-[11px] text-dim hover:text-lo transition-colors px-1.5 py-0.5 rounded"
            >
              clear
            </button>
          )}
        </div>

        {/* Results list */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-1">
              <p className="text-[13px] text-dim">
                {query ? `No results for "${query}"` : "Your library is empty"}
              </p>
              {query && (
                <p className="text-[11px] text-dim/50">
                  Try a different spelling or add items in the Library.
                </p>
              )}
            </div>
          ) : (
            <>
              {showSectionLabel && (
                <div className="px-4 pt-2.5 pb-1">
                  <p className="text-[9px] font-bold text-dim uppercase tracking-[0.12em]">
                    {sectionLabel}
                  </p>
                </div>
              )}
              {results.map((entry, i) => (
                <ResultRow
                  key={entry.id}
                  entry={entry}
                  selected={i === selectedIdx}
                  isRecent={recentSet.has(entry.id) && !query.trim()}
                  isFavorite={favoriteIds.has(entry.id)}
                  onPointerEnter={() => setSel(i)}
                  onClick={() => execute(entry)}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3">
            {(["↑↓ navigate", "↵ open", "esc close"] as const).map((hint) => (
              <span key={hint} className="text-[10px] text-dim/60 font-mono">{hint}</span>
            ))}
          </div>
          <span className="text-[10px] text-dim/40 font-mono">⌘⇧Space</span>
        </div>
      </div>
    </div>
  );
}
