"use client";

import { useEffect, useRef, useState } from "react";
import { captureKinds, type CaptureKind } from "@/data/mission";

/**
 * Universal capture (EPIC-001 §Captura). Always reachable, accepts anything,
 * and never asks the user to choose a destination — the system organises it
 * afterwards. Mocked: capture is acknowledged locally.
 */
export default function CapturePanel({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<CaptureKind>("texto");
  const [value, setValue] = useState("");
  const [captured, setCaptured] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const capture = () => {
    if (!value.trim() && kind === "texto") return;
    setCaptured(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-charcoal/20 px-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl border border-line-strong bg-cream"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
          <h2 className="font-serif text-xl">Capturar</h2>
          <span className="meta">O sistema organiza depois</span>
        </div>

        {captured ? (
          <div className="px-5 py-10 text-center">
            <p className="font-serif text-2xl text-charcoal">Capturado.</p>
            <p className="meta mt-2">
              Guardado na entrada. O sistema trata da organização.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                className="action"
                onClick={() => {
                  setCaptured(false);
                  setValue("");
                }}
              >
                Capturar outro
              </button>
              <button type="button" className="action-quiet" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {captureKinds.map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  onClick={() => setKind(c.kind)}
                  className={[
                    "border px-3 py-1 text-[12.5px] transition-colors",
                    kind === c.kind
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-line text-muted hover:border-line-strong hover:text-charcoal",
                  ].join(" ")}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              placeholder={
                kind === "texto" || kind === "nota"
                  ? "Escreva ou cole aqui…"
                  : `Anexar ${kind} — ou colar uma referência…`
              }
              className="w-full resize-none border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-charcoal outline-none placeholder:text-beige focus:border-line-strong"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="meta">Esc para fechar</span>
              <button type="button" className="action" onClick={capture}>
                Capturar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
