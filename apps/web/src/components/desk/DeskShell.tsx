"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SearchResult } from "@/lib/mission";
import CommandSearch from "@/components/mission/CommandSearch";
import CapturePanel from "@/components/mission/CapturePanel";

export interface NavLink {
  label: string;
  href?: string;
  /** Special affordances that open an overlay instead of navigating. */
  action?: "search" | "capture";
  /** Match the route exactly (no descendant highlighting). */
  exact?: boolean;
}

/**
 * Atelier Desk shell.
 *
 * A persistent left navigation plus a quiet topbar (global search + universal
 * capture). The shell wraps the whole working area; the two overlays keep the
 * user in place. Applied to every page in the (main) group so navigation is
 * consistent across the desk and the supervision views.
 */
export default function DeskShell({
  corpus,
  primaryNav,
  footerNav,
  children,
}: {
  corpus: SearchResult[];
  primaryNav: NavLink[];
  footerNav: NavLink[];
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

  const isActive = (item: NavLink) => {
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const renderItem = (item: NavLink) => {
    if (item.action) {
      return (
        <button
          key={item.label}
          type="button"
          className="atelier-nav-item"
          onClick={() =>
            item.action === "search"
              ? setSearchOpen(true)
              : setCaptureOpen(true)
          }
        >
          {item.label}
        </button>
      );
    }
    return (
      <Link
        key={item.label}
        href={item.href ?? "/"}
        className={`atelier-nav-item${isActive(item) ? " active" : ""}`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="atelier-shell">
      <aside className="atelier-sidebar">
        <div>
          <Link href="/" className="atelier-logo">
            Atelier
          </Link>
          <nav className="atelier-nav">{primaryNav.map(renderItem)}</nav>
        </div>

        <div className="atelier-sidebar-foot">
          <nav className="atelier-nav">{footerNav.map(renderItem)}</nav>
          <div className="atelier-user">
            <span className="avatar">IG</span>
            <span>Inês Gavinho</span>
          </div>
        </div>
      </aside>

      <div className="atelier-main">
        <div className="atelier-topbar">
          <button
            type="button"
            className="atelier-search"
            onClick={() => setSearchOpen(true)}
            aria-label="Pesquisar"
          >
            <span>Pesquisar</span>
            <kbd>⌘K</kbd>
          </button>
          <button
            type="button"
            className="atelier-capture-button"
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
  );
}
