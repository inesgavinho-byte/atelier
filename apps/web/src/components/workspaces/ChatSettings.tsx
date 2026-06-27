"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CHAT_PROVIDER_LABELS,
  PROVIDER_META,
  providerIdFromLabel,
} from "@/lib/ai/types";
import { updateChatSettings } from "@/app/(main)/workspaces/actions";

/**
 * Change a chat's provider / model / temperature. Switching provider preserves
 * the conversation — only the execution engine changes.
 */
export default function ChatSettings({
  chatId,
  provider,
  model,
  temperature,
}: {
  chatId: string;
  provider: string;
  model?: string;
  temperature?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prov, setProv] = useState(provider);
  const [mdl, setMdl] = useState(model ?? "");
  const [temp, setTemp] = useState(temperature ?? 0.7);
  const [busy, start] = useTransition();

  const meta = PROVIDER_META.find((m) => m.id === providerIdFromLabel(prov));
  const models = meta?.models ?? [];

  const save = () => {
    start(async () => {
      await updateChatSettings({
        chatId,
        provider: prov,
        model: mdl || meta?.defaultModel || "",
        temperature: temp,
      });
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        className="action-quiet"
        onClick={() => setOpen(true)}
      >
        {provider}
        {model ? ` · ${model}` : ""} · ajustar
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={prov}
        onChange={(e) => {
          const next = e.target.value;
          setProv(next);
          const m = PROVIDER_META.find(
            (x) => x.id === providerIdFromLabel(next)
          );
          setMdl(m?.defaultModel ?? "");
        }}
        className="border border-line bg-surface px-2 py-1.5 text-[13px] text-charcoal focus:border-charcoal focus:outline-none"
      >
        {CHAT_PROVIDER_LABELS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {models.length ? (
        <select
          value={mdl}
          onChange={(e) => setMdl(e.target.value)}
          className="border border-line bg-surface px-2 py-1.5 text-[13px] text-charcoal focus:border-charcoal focus:outline-none"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : null}
      <input
        type="number"
        min={0}
        max={2}
        step={0.1}
        value={temp}
        onChange={(e) => setTemp(Number(e.target.value))}
        className="w-20 border border-line bg-surface px-2 py-1.5 text-[13px] text-charcoal focus:border-charcoal focus:outline-none"
        aria-label="Temperatura"
      />
      <button
        type="button"
        className="action"
        onClick={save}
        disabled={busy}
      >
        Guardar
      </button>
      <button
        type="button"
        className="action-quiet"
        onClick={() => setOpen(false)}
      >
        Cancelar
      </button>
    </div>
  );
}
