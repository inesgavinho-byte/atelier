import SystemTests from "@/components/admin/SystemTests";
import {
  checkDatabase,
  getEnvPresence,
  getEnvironmentInfo,
  getIntegrations,
  getPerformance,
  getPlatform,
  type Health,
  type Probe,
} from "@/lib/diagnostics";

export const dynamic = "force-dynamic";

const DOT: Record<Health, string> = {
  online: "bg-olive",
  warning: "bg-beige",
  offline: "bg-charcoal",
  na: "bg-line-strong",
};
const LABEL: Record<Health, string> = {
  online: "Online",
  warning: "Warning",
  offline: "Offline",
  na: "—",
};

function Status({ health }: { health: Health }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-muted">
      <span className={`dot ${DOT[health]}`} />
      {LABEL[health]}
    </span>
  );
}

function Section({
  n,
  title,
  aside,
  children,
}: {
  n: string;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="eyebrow">
          {n} · {title}
        </h2>
        {aside ? <span className="meta">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function ProbeRows({ probes }: { probes: Probe[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {probes.map((p) => (
        <li
          key={p.label}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5"
        >
          <span className="text-[14px] text-charcoal">{p.label}</span>
          <div className="flex items-center gap-5">
            {p.latencyMs != null ? (
              <span className="meta">{p.latencyMs} ms</span>
            ) : null}
            {p.detail ? <span className="meta">{p.detail}</span> : null}
            <Status health={p.health} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function SystemPage() {
  // Each section computed independently; checkDatabase is shared (one probe).
  const db = await checkDatabase();
  const [platform, integrations] = await Promise.all([
    getPlatform(db),
    getIntegrations(db),
  ]);
  const env = getEnvironmentInfo();
  const envVars = getEnvPresence();
  const perf = getPerformance(db);

  return (
    <div>
      <div className="eyebrow mb-3">Administração · Sala de controlo</div>
      <h1 className="font-serif text-4xl md:text-5xl">Sistema</h1>
      <p className="meta mt-3 max-w-2xl">
        Estado de saúde da plataforma ATELIER e das suas integrações. Cada secção
        falha de forma independente; nenhuma chave ou segredo é exposta.
      </p>

      <div className="mt-12">
        <Section n="1" title="Plataforma">
          <ProbeRows probes={platform} />
        </Section>

        <Section
          n="2"
          title="Integrações"
          aside="apenas Supabase é verificada ativamente"
        >
          <ProbeRows probes={integrations} />
        </Section>

        <Section n="3" title="Ambiente">
          <dl className="grid grid-cols-1 gap-px border-l border-t border-line sm:grid-cols-2">
            {env.map((e) => (
              <div key={e.label} className="border-b border-r border-line bg-cream px-5 py-3">
                <dt className="eyebrow mb-1">{e.label}</dt>
                <dd className="text-[13.5px] font-mono break-all">{e.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section
          n="4"
          title="Base de dados"
          aside={db.latencyMs != null ? `${db.latencyMs} ms` : undefined}
        >
          <div className="mb-4">
            <Status health={db.health} />
            {db.error ? (
              <p className="mt-2 font-mono text-[12.5px] break-all text-charcoal">
                {db.error}
              </p>
            ) : null}
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {db.counts.map((c) => (
              <li
                key={c.table}
                className="flex items-center justify-between gap-6 py-2.5"
              >
                <span className="text-[14px] text-charcoal">{c.table}</span>
                <span className="meta font-mono">
                  {c.error ? `erro: ${c.error}` : c.count}
                </span>
              </li>
            ))}
            {db.counts.length === 0 ? (
              <li className="py-2.5 meta italic">Sem ligação à base de dados.</li>
            ) : null}
          </ul>
        </Section>

        <Section n="5" title="Variáveis de ambiente" aside="presença apenas">
          <ul className="divide-y divide-line border-y border-line">
            {envVars.map((v) => (
              <li
                key={v.label}
                className="flex items-center justify-between gap-6 py-2.5"
              >
                <span className="text-[14px] font-mono text-charcoal">
                  {v.label}
                </span>
                <span className="inline-flex items-center gap-2 text-[12.5px] text-muted">
                  <span className={`dot ${v.present ? "bg-olive" : "bg-charcoal"}`} />
                  {v.present ? "Presente" : "Em falta"}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n="6" title="Testes de sistema">
          <SystemTests />
        </Section>

        <Section n="7" title="Logs">
          <p className="meta">
            Sem fonte de logs integrada. Os erros de runtime aparecem nos logs de
            funções do Netlify e os erros de base de dados são mostrados na secção
            4. Uma integração de logs (ex.: Sentry) tornará esta secção ativa.
          </p>
        </Section>

        <Section n="8" title="Desempenho">
          <ul className="divide-y divide-line border-y border-line">
            {perf.map((p) => (
              <li
                key={p.label}
                className="flex items-center justify-between gap-6 py-2.5"
              >
                <span className="text-[14px] text-charcoal">{p.label}</span>
                <span className="meta font-mono">{p.value}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n="9" title="AI Runtime" aside="inativo">
          <div className="border border-dashed border-line px-6 py-10 text-center">
            <p className="meta italic">
              Reservado. Mostrará agentes em execução, tarefas em fila, uso e
              custos de LLM, limites, fornecedor atual e de recurso, e tempo médio
              de execução.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
