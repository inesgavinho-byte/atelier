"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, NavSection } from "@/components/shell/AppShell";
import ThemeToggle from "@/components/shell/ThemeToggle";
import { workspaceColor } from "@/lib/workspace-color";
import { logout } from "@/app/login/actions";

/**
 * Translucent left navigation. Active route is highlighted; workspace entries
 * get a deterministic coloured avatar. Footer pins the user + theme toggle.
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

    return (
      <Link
        key={item.label}
        href={item.href ?? "/"}
        className={`shell-nav-item${isActive(item) ? " active" : ""}`}
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
