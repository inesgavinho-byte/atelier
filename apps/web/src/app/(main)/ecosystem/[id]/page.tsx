import { notFound } from "next/navigation";
import Link from "next/link";
import OpenAITestForm from "@/components/ecosystem/OpenAITestForm";
import { getConnectorView } from "@/lib/connector-status";
import { getConnectorDef } from "@/lib/connectors";
import { getInitiatives } from "@/lib/mission";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { id: string } }) {
  const def = getConnectorDef(params.id);
  return { title: def ? `${def.name} — Ecossistema` : "Ecossistema" };
}

export default async function ConnectorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const view = getConnectorView(params.id);
  if (!view) notFound();

  const initiatives =
    view.id === "openai"
      ? (await getInitiatives()).map((i) => ({ id: i.id, name: i.name }))
      : [];
  const configured = view.status === "Ligado";

  return (
    <div>
      <Link href="/ecosystem" className="action-quiet mb-10 inline-block">
        ← Ecossistema
      </Link>

      <p className="eyebrow mb-2">{view.category}</p>
      <h1 className="font-serif text-4xl md:text-5xl">{view.name}</h1>
      <p className="meta mt-3">Estado: {view.status}</p>

      {/* Capabilities */}
      <section className="mt-10">
        <h2 className="eyebrow mb-4">Capacidades</h2>
        <ul className="space-y-1">
          {view.capabilities.map((cap) => (
            <li key={cap} className="text-[15px] text-charcoal/90">
              · {cap}
            </li>
          ))}
        </ul>
      </section>

      {/* Credentials (presence only — never values) */}
      <section className="mt-10">
        <h2 className="eyebrow mb-4">Credenciais</h2>
        <ul className="divide-y divide-line border-y border-line">
          {view.env.map((e) => (
            <li
              key={e.name}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="font-mono text-[13px] text-charcoal">
                {e.name}
                {e.required ? "" : " (opcional)"}
              </span>
              <span className="meta">{e.present ? "presente" : "em falta"}</span>
            </li>
          ))}
        </ul>
        <p className="meta mt-3">
          Apenas é mostrada a presença de cada variável — nunca o seu valor.
        </p>
      </section>

      {/* OpenAI test form */}
      {view.id === "openai" ? (
        <OpenAITestForm initiatives={initiatives} configured={configured} />
      ) : null}
    </div>
  );
}
