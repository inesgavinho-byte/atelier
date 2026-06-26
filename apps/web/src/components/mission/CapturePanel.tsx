"use client";

import { useEffect, useRef, useState } from "react";
import { captureKinds, type CaptureKind } from "@/data/mission";

/**
 * Universal capture (EPIC-001 §Captura). Always reachable, accepts anything,
 * and never asks the user to choose a destination — the system organises it
 * afterwards. This sprint: captures are kept in local memory (localStorage);
 * no backend, no persistence beyond the browser.
 */

interface Capture {
  id: string;
  kind: CaptureKind;
  value: string;
  at: string;
}

const STORE_KEY = "atelier.captures";

function readStore(): Capture[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeStore(items: Capture[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export default function CapturePanel({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<CaptureKind>("texto");
  const [value, setValue] = useState("");
  const [recent, setRecent] = useState<Capture[]>([]);
  const [justCaptured, setJustCaptured] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRecent(readStore());
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const capture = () => {
    const text = value.trim() || `(${kind} sem descrição)`;
    // Deterministic id without Date.now/Math.random in render-critical paths.
    const item: Capture = {
      id: `cap-${recent.length + 1}-${kind}`,
      kind,
      value: text,
      at: new Date().toISOString(),
    };
    const next = [item, ...recent];
    setRecent(next);
    writeStore(next);
    setValue("");
    setJustCaptured(true);
    inputRef.current?.focus();
    window.setTimeout(() => setJustCaptured(false), 1800);
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
            <span className="meta">
              {justCaptured ? (
                <span className="inline-flex items-center gap-2 text-charcoal">
                  <span className="dot bg-olive" /> Capturado em memória local.
                </span>
              ) : (
                "Esc para fechar"
              )}
            </span>
            <button type="button" className="action" onClick={capture}>
              Capturar
            </button>
          </div>

          {recent.length > 0 ? (
            <div className="mt-6 border-t border-line pt-4">
              <div className="eyebrow mb-3">Capturas recentes</div>
              <ul className="space-y-2">
                {recent.slice(0, 5).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-baseline justify-between gap-4 text-[13px]"
                  >
                    <span className="truncate text-charcoal">{c.value}</span>
                    <span className="meta shrink-0">{c.kind}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
