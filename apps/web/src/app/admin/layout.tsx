import type { Metadata } from "next";

/**
 * Administration area. Not linked anywhere and not indexed. There is no auth
 * layer yet, so access control is by obscurity + noindex only — a real guard
 * belongs to a future authentication sprint.
 */
export const metadata: Metadata = {
  title: "Sistema — ATELIER",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="control-room">
      <div className="mx-auto max-w-atelier px-6 py-12 md:px-10">{children}</div>
    </div>
  );
}
