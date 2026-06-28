"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SearchResult } from "@/lib/mission";
import CommandSearch from "@/components/mission/CommandSearch";
import CapturePanel from "@/components/mission/CapturePanel";
import { OverlayContext } from "@/components/app/overlay";
import { logout } from "@/app/login/actions";

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
  exact?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * Atelier application shell — a simplified, grouped sidebar plus a quiet topbar
 * (global search + universal capture). Provides the overlay API so the home
 * launcher can open search/capture from its own cards. Wraps the whole (main)
 * group; the overlays keep the user in place.
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

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const renderItem = (item: NavItem) => {
    const inner = (
      <>
        {item.initial ? (
          <span className="workspace-initial">{item.initial}</span>
        ) : item.icon ? (
          <span className="sidebar-icon" aria-hidden>
            {item.icon}
          </span>
        ) : null}
        <span>{item.label}</span>
        {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
      </>
    );
    if (item.action) {
      return (
        <button
          key={item.label}
          type="button"
          className="sidebar-item"
          onClick={() =>
            item.action === "search"
              ? setSearchOpen(true)
              : setCaptureOpen(true)
          }
        >
          {inner}
        </button>
      );
    }
    return (
      <Link
        key={item.label}
        href={item.href ?? "/"}
        className={`sidebar-item${isActive(item) ? " active" : ""}`}
      >
        {inner}
      </Link>
    );
  };

  return (
    <OverlayContext.Provider
      value={{
        openSearch: () => setSearchOpen(true),
        openCapture: () => setCaptureOpen(true),
      }}
    >
      <div className="app-shell">
        <aside className="sidebar">
          <Link href="/" className="sidebar-logo">
            Atelier
          </Link>

          {sections.map((section, i) => (
            <div key={i} className="sidebar-section">
              {section.label ? (
                <p className="sidebar-label">{section.label}</p>
              ) : null}
              <nav className="sidebar-nav">{section.items.map(renderItem)}</nav>
            </div>
          ))}

          <div className="sidebar-footer">
            <span className="user-avatar">IG</span>
            <div>
              <div style={{ fontSize: 14 }}>Inês Gavinho</div>
              <div style={{ fontSize: 12, color: "var(--atelier-muted)" }}>
                ATELIER
              </div>
            </div>
            {gated ? (
              <form action={logout} className="sidebar-logout">
                <button type="submit" className="sidebar-logout-button">
                  Sair
                </button>
              </form>
            ) : null}
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <button
              type="button"
              className="global-search"
              onClick={() => setSearchOpen(true)}
              aria-label="Pesquisar"
            >
              Pesquisar…
            </button>
            <button
              type="button"
              className="capture-button"
              onClick={() => setCaptureOpen(true)}
            >
              Capturar
            </button>
          </div>

          {children}
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
