"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SearchResult } from "@/lib/mission";
import CommandSearch from "@/components/mission/CommandSearch";
import CapturePanel from "@/components/mission/CapturePanel";

/**
 * Mission Control chrome: a quiet masthead that holds the only two persistent
 * affordances — global search and universal capture. Navigation otherwise
 * emerges from the work itself. Both open as overlays, so the user never
 * leaves their place.
 */
export default function MissionChrome({
  corpus,
  children,
}: {
  corpus: SearchResult[];
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const pathname = usePathname();

  // Close overlays on route change.
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

  const onHome = pathname === "/";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-atelier items-center gap-4 px-6 py-4 md:px-10">
          <Link href="/" className="shrink-0" aria-label="Mission Control">
            <span className="font-serif text-lg tracking-[0.22em] text-charcoal">
              ATELIER
            </span>
          </Link>

          {!onHome ? (
            <Link href="/" className="action-quiet hidden sm:inline-flex">
              ← Mission Control
            </Link>
          ) : null}

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group flex items-center gap-3 border border-line px-3 py-1.5 text-muted transition-colors hover:border-line-strong hover:text-charcoal"
              aria-label="Pesquisar"
            >
              <span className="text-[13px]">Pesquisar</span>
              <kbd className="hidden rounded border border-line px-1.5 text-[10px] tracking-wider text-muted sm:inline">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              className="action"
            >
              Capturar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-atelier px-6 py-10 md:px-10 md:py-14">
        {children}
      </main>

      {searchOpen ? (
        <CommandSearch corpus={corpus} onClose={() => setSearchOpen(false)} />
      ) : null}
      {captureOpen ? (
        <CapturePanel onClose={() => setCaptureOpen(false)} />
      ) : null}
    </div>
  );
}
