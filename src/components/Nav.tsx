"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/team", label: "Team" },
  { href: "/memory", label: "Memory" },
  { href: "/approvals", label: "Approvals" },
  { href: "/activity", label: "Activity" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Nav({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname() || "/";

  if (orientation === "horizontal") {
    return (
      <nav
        className="flex items-center gap-5 overflow-x-auto"
        aria-label="Primary"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "whitespace-nowrap text-[13px] transition-colors",
                active
                  ? "text-charcoal border-b border-charcoal pb-0.5"
                  : "text-muted hover:text-charcoal",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex items-center gap-3 py-1.5 transition-colors",
              active ? "text-charcoal" : "text-muted hover:text-charcoal",
            ].join(" ")}
          >
            <span
              className={[
                "h-px transition-all",
                active
                  ? "w-6 bg-charcoal"
                  : "w-3 bg-line-strong group-hover:w-6 group-hover:bg-olive",
              ].join(" ")}
            />
            <span className="text-[14px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
