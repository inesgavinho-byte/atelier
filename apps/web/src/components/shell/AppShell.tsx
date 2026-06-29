"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { SearchResult } from "@/lib/mission";
import CommandSearch from "@/components/mission/CommandSearch";
import CapturePanel from "@/components/mission/CapturePanel";
import { OverlayContext } from "@/components/app/overlay";
import Sidebar from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";

export interface NavItem {
  label: string;
  href?: string;
  action?: "search" | "capture";
  /** Leading glyph icon (when not a workspace monogram). */
  icon?: string;
  /** Monogram shown in a tile (workspace entries). */
  initial?: string;
  /** Small count badge. */
  badge?: number;
  /** Workspace name — colours the avatar via workspaceColor(). */
  workspace?: string;
  exact?: boolean;
  /** Expandable children (e.g. a workspace's projects). */
  children?: NavItem[];
  /** Stable key for persisting expand/collapse state (e.g. workspace id). */
  expandKey?: string;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * Atelier application shell — visionOS/macOS visual language. A translucent
 * sidebar + a blurred topbar over the page content. Owns the search/capture
 * overlay state and the Cmd/Ctrl+K shortcut, and exposes the overlay API so
 * home-page islands can open them in place.
 */
export default function AppShell({
  corpus,
  sections,
  gated = false,
  children,
}: {
  corpus: SearchResult[];
  sections: NavSection[];
  /** When the access gate is on, show a Sair (logout) control. */
  gated?: boolean;
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSearchOpen(false);
    setCaptureOpen(false);
  }, [pathname]);

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setSearchOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openCapture = useCallback(() => setCaptureOpen(true), []);

  return (
    <OverlayContext.Provider value={{ openSearch, openCapture }}>
      <div className="shell">
        <Sidebar
          sections={sections}
          gated={gated}
          onSearch={openSearch}
          onCapture={openCapture}
        />

        <div className="shell-main">
          <Topbar onCapture={openCapture} />
          <div className="shell-content">{children}</div>
        </div>

        {searchOpen ? (
          <CommandSearch corpus={corpus} onClose={() => setSearchOpen(false)} />
        ) : null}
        {captureOpen ? (
          <CapturePanel onClose={() => setCaptureOpen(false)} />
        ) : null}
      </div>
    </OverlayContext.Provider>
  );
}
