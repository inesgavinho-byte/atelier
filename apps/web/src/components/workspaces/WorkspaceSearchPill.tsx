"use client";

import { useOverlay } from "@/components/app/overlay";

/**
 * The "Pesquisar tudo" field that sits on the workspace action bar, aligned
 * with the Decisões / Timeline / Importar pills. Opens the global command
 * palette (same as ⌘K) via the overlay context, so there is no separate
 * search row above the chat.
 */
export default function WorkspaceSearchPill() {
  const { openSearch } = useOverlay();
  return (
    <button
      type="button"
      className="ws-search-pill"
      onClick={openSearch}
      aria-label="Pesquisar tudo"
    >
      <span className="ws-search-icon" aria-hidden>
        ⌕
      </span>
      <span className="ws-search-text">Pesquisar tudo…</span>
      <kbd className="ws-search-kbd">⌘K</kbd>
    </button>
  );
}
