"use client";

/**
 * Sticky translucent top bar. Search now lives on the workspace action row (and
 * the sidebar / ⌘K), so the header only carries spacing + the Capturar action.
 */
export default function Topbar({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="shell-topbar">
      <div className="shell-topbar-spacer" />
      <button type="button" className="btn-primary" onClick={onCapture}>
        Capturar
      </button>
    </div>
  );
}
