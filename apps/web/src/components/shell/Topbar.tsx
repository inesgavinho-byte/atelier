"use client";

/** Sticky translucent top bar: centered search trigger + Capturar action. */
export default function Topbar({
  onSearch,
  onCapture,
}: {
  onSearch: () => void;
  onCapture: () => void;
}) {
  return (
    <div className="shell-topbar">
      <button
        type="button"
        className="shell-search-trigger"
        onClick={onSearch}
        aria-label="Pesquisar"
      >
        <span className="shell-search-icon" aria-hidden>
          ⌕
        </span>
        <span>Pesquisar</span>
        <kbd className="shell-search-kbd">⌘K</kbd>
      </button>
      <button type="button" className="btn-primary" onClick={onCapture}>
        Capturar
      </button>
    </div>
  );
}
