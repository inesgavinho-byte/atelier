"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, NavSection } from "@/components/shell/AppShell";
import ThemeToggle from "@/components/shell/ThemeToggle";
import { workspaceColor } from "@/lib/workspace-color";
import { logout } from "@/app/login/actions";

const EXPANDED_KEY = "atelier-ws-expanded";

/**
 * Translucent left navigation. Active route is highlighted; workspace entries
 * get a deterministic coloured avatar and expand to reveal their projects. The
 * active workspace expands automatically; manual toggles persist to
 * localStorage. Footer pins the user + theme toggle.
 */
export default function Sidebar({
  sections,
  gated,
  onSearch,
  onCapture,
}: {
  sections: NavSection[];
  gated: boolean;
  onSearch: () => void;
  onCapture: () => void;
}) {
  const pathname = usePathname();

  // Explicit user toggles, keyed by expandKey. Absent = follow the active route.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXPANDED_KEY);
      if (raw) setOpen(JSON.parse(raw));
    } catch {
      /* ignore malformed/blocked storage */
    }
  }, []);

  const toggle = (key: string, next: boolean) => {
    setOpen((prev) => {
      const updated = { ...prev, [key]: next };
      try {
        window.localStorage.setItem(EXPANDED_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const renderItem = (item: NavItem) => {
    const color = item.workspace ? workspaceColor(item.workspace) : null;
    const inner = (
      <>
        {item.workspace ? (
          <span
            className="shell-ws-avatar"
            style={{ background: color!.bg, color: color!.text }}
          >
            {item.workspace.charAt(0).toUpperCase()}
          </span>
        ) : item.initial ? (
          <span className="shell-ws-avatar">{item.initial}</span>
        ) : item.icon ? (
          <span className="shell-nav-icon" aria-hidden>
            {item.icon}
          </span>
        ) : null}
        <span className="shell-nav-label">{item.label}</span>
        {item.badge ? (
          <span className="shell-nav-badge">{item.badge}</span>
        ) : null}
      </>
    );

    if (item.action) {
      return (
        <button
          key={item.label}
          type="button"
          className="shell-nav-item"
          onClick={item.action === "search" ? onSearch : onCapture}
        >
          {inner}
        </button>
      );
    }

    // Tint the active workspace row with its own colour (subtle wash) instead
    // of the generic accent, so each workspace keeps its identity.
    const wsTint =
      color && isActive(item)
        ? ({ ["--ws-tint" as string]: color.tint } as React.CSSProperties)
        : undefined;

    // Expandable workspace: a row (link + chevron) plus its projects.
    if (item.children?.length && item.expandKey) {
      const key = item.expandKey;
      const activeAncestor = isActive(item);
      const expanded = key in open ? open[key] : activeAncestor;
      return (
        <div key={item.label} className="shell-nav-group">
          <div
            className={`shell-nav-item${item.workspace ? " is-workspace" : ""}${
              isActive(item) ? " active" : ""
            }`}
            style={wsTint}
          >
            <Link href={item.href ?? "/"} className="shell-nav-item-main">
              {inner}
            </Link>
            <button
              type="button"
              className={`shell-nav-toggle${expanded ? " open" : ""}`}
              aria-label={expanded ? "Colapsar" : "Expandir"}
              aria-expanded={expanded}
              onClick={() => toggle(key, !expanded)}
            >
              ›
            </button>
          </div>
          {expanded ? (
            <div className="shell-nav-children">
              {item.children.map((child) => (
                <Link
                  key={child.label}
                  href={child.href ?? "/"}
                  className={`shell-nav-child${isActive(child) ? " active" : ""}`}
                >
                  {child.icon ? (
                    <span className="shell-nav-child-icon" aria-hidden>
                      {child.icon}
                    </span>
                  ) : (
                    <span className="shell-nav-child-bullet" aria-hidden>
                      ↳
                    </span>
                  )}
                  <span className="shell-nav-label">{child.label}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href ?? "/"}
        className={`shell-nav-item${item.workspace ? " is-workspace" : ""}${
          isActive(item) ? " active" : ""
        }`}
        style={wsTint}
      >
        {inner}
      </Link>
    );
  };

  return (
    <aside className="shell-sidebar">
      <Link href="/" className="shell-logo">
        ATELIER
      </Link>

      <div className="shell-nav-scroll">
        {sections.map((section, i) => (
          <div key={i} className="shell-nav-section">
            {section.label ? (
              <p className="shell-nav-section-label">{section.label}</p>
            ) : null}
            <nav className="shell-nav">{section.items.map(renderItem)}</nav>
          </div>
        ))}
      </div>

      <div className="shell-sidebar-foot">
        <span className="shell-user-avatar">IG</span>
        <div className="shell-user-meta">
          <span className="shell-user-name">Inês Gavinho</span>
          {gated ? (
            <form action={logout}>
              <button type="submit" className="shell-logout">
                Sair
              </button>
            </form>
          ) : (
            <span className="shell-user-org">ATELIER</span>
          )}
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
