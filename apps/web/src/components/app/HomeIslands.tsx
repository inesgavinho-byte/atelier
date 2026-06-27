"use client";

import { useOverlay } from "@/components/app/overlay";

/** The two quick-action cards (Pesquisar / Capturar) that open overlays. */
export function QuickActions() {
  const { openSearch, openCapture } = useOverlay();
  return (
    <>
      <button type="button" className="card quick-card" onClick={openSearch}>
        <span className="quick-icon">⌕</span>
        <span>
          <span className="quick-title">Pesquisar</span>
          <span className="quick-copy">
            Encontra qualquer coisa de imediato.
          </span>
        </span>
      </button>
      <button type="button" className="card quick-card" onClick={openCapture}>
        <span className="quick-icon">+</span>
        <span>
          <span className="quick-title">Capturar</span>
          <span className="quick-copy">
            Guarda ideias, links, documentos e notas.
          </span>
        </span>
      </button>
    </>
  );
}

/** Quick-capture buttons in the right rail; each opens the capture overlay. */
export function QuickCaptureList() {
  const { openCapture } = useOverlay();
  const options = ["Nova nota", "Link", "Documento", "Imagem", "Fala"];
  return (
    <div className="capture-list">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="capture-option"
          onClick={openCapture}
        >
          <span className="workspace-initial" aria-hidden>
            {o.charAt(0)}
          </span>
          <span>{o}</span>
        </button>
      ))}
    </div>
  );
}
