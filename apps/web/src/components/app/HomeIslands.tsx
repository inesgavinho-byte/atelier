"use client";

import { useOverlay } from "@/components/app/overlay";

/** Redesigned home quick-action cards that open the search/capture overlays. */
export function HomeQuickActions() {
  const { openSearch, openCapture } = useOverlay();
  return (
    <>
      <button type="button" className="home-quick-card" onClick={openSearch}>
        <span className="home-quick-glyph" aria-hidden>
          ⌕
        </span>
        <span className="home-quick-title">Pesquisar</span>
        <span className="home-quick-copy">Encontra qualquer coisa.</span>
      </button>
      <button type="button" className="home-quick-card" onClick={openCapture}>
        <span className="home-quick-glyph" aria-hidden>
          ＋
        </span>
        <span className="home-quick-title">Capturar</span>
        <span className="home-quick-copy">Guarda ideias, links e notas.</span>
      </button>
    </>
  );
}

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
        <span className="quick-chevron" aria-hidden>
          ›
        </span>
      </button>
      <button type="button" className="card quick-card" onClick={openCapture}>
        <span className="quick-icon">＋</span>
        <span>
          <span className="quick-title">Capturar</span>
          <span className="quick-copy">
            Guarda ideias, links, documentos e notas.
          </span>
        </span>
        <span className="quick-chevron" aria-hidden>
          ›
        </span>
      </button>
    </>
  );
}

/** Quick-capture buttons in the right rail; each opens the capture overlay. */
export function QuickCaptureList() {
  const { openCapture } = useOverlay();
  const options: { icon: string; label: string }[] = [
    { icon: "▤", label: "Nova nota" },
    { icon: "🔗", label: "Link" },
    { icon: "▧", label: "Documento" },
    { icon: "▣", label: "Imagem" },
    { icon: "🎙", label: "Fala" },
  ];
  return (
    <div className="capture-list">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          className="capture-option"
          onClick={openCapture}
        >
          <span aria-hidden>{o.icon}</span>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
