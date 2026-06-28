import type { ReactNode } from "react";
import Link from "next/link";

/** A panel's header row: uppercase label + optional right-side link. */
export default function PanelHeader({
  title,
  action,
}: {
  title: ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div className="shell-panel-header">
      <span className="shell-panel-title">{title}</span>
      {action ? (
        <Link href={action.href} className="shell-panel-link">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
