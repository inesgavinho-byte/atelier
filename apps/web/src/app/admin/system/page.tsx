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
  online: "success",
  warning: "warning",
  offline: "danger",
  na: "na",
};
const TXT: Record<Health, string> = {
  online: "status-success",
  warning: "status-warning",
  offline: "status-danger",
  na: "",
};
const LABEL: Record<Health, string> = {
  online: "Online",
  warning: "Warning",
  offline: "Offline",
  na: "—",
};

function Status({ health }: { health: Health }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`dot ${DOT[health]}`} />
      <span className={`text-[12.5px] ${TXT[health]}`}>{LABEL[health]}</span>
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
    <section className="mb-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="card-section-title">
          {n} · {title}
        </h2>
        {aside ? <span className="page-subtitle">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function StatusCards({ probes }: { probes: Probe[] }) {
  return (
    <div className="system-grid">
      {probes.map((p) => (
        <div key={p.label} className="card status-card">
          <div className="label">{p.label}</div>
          <div className="row">
            <Status health={p.health} />
            <span className="truncate text-right">
              {p.latencyMs != null ? `${p.latencyMs} ms` : p.detail ?? ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function SystemPage() {
  // Each section computed independently; checkDatabase is the shared probe.
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
      <h1 className="page-title">Sistema</h1>
      <p className="page-subtitle mt-3 max-w-2xl">
        Estado de saúde da plataforma ATELIER e das suas integrações. Cada secção
        falha de forma independente; nenhuma chave ou segredo é exposta.
      </p>

      <div className="mt-12">
        <Section n="01" title="Plataforma">
          <StatusCards probes={platform} />
        </Section>

        <Section
          n="02"
          title="Integrações"
          aside="apenas Supabase é verificada ativamente"
        >
          <StatusCards probes={integrations} />
        </Section>

        <Section n="03" title="Ambiente">
          <div className="card system-card">
            {env.map((e) => (
              <div key={e.label} className="metric-row">
                <span className="text-[13px] text-muted">{e.label}</span>
                <span className="font-mono text-[13px] break-all text-charcoal">
                  {e.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          n="04"
          title="Base de dados"
          aside={db.latencyMs != null ? `${db.latencyMs} ms` : undefined}
        >
          <div className="card system-card">
            <div className="mb-3 flex items-center justify-between">
              <Status health={db.health} />
              {db.error ? (
                <span className="font-mono text-[12px] break-all status-danger">
                  {db.error}
                </span>
              ) : null}
            </div>
            {db.counts.length === 0 ? (
              <p className="page-subtitle italic">
                Sem ligação à base de dados.
              </p>
            ) : (
              db.counts.map((c) => (
                <div key={c.table} className="metric-row">
                  <span className="text-[14px] text-charcoal">{c.table}</span>
                  <span className="font-mono text-[13px] text-muted">
                    {c.error ? `erro: ${c.error}` : c.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section n="05" title="Variáveis de ambiente" aside="presença apenas">
          <div className="card system-card">
            {envVars.map((v) => (
              <div key={v.label} className="env-row">
                <span className="font-mono text-[13px] text-charcoal">
                  {v.label}
                </span>
                <span className="inline-flex items-center gap-2 text-[12.5px]">
                  <span className={`dot ${v.present ? "success" : "danger"}`} />
                  <span className={v.present ? "status-success" : "status-danger"}>
                    {v.present ? "Presente" : "Em falta"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section n="06" title="Testes de sistema">
          <div className="card system-card">
            <SystemTests />
          </div>
        </Section>

        <Section n="07" title="Logs">
          <div className="card system-card">
            <p className="page-subtitle">
              Sem fonte de logs integrada. Os erros de runtime aparecem nos logs
              de funções do Netlify e os erros de base de dados são mostrados na
              secção 04. Uma integração de logs (ex.: Sentry) tornará esta secção
              ativa.
            </p>
          </div>
        </Section>

        <Section n="08" title="Desempenho">
          <div className="card system-card">
            {perf.map((p) => (
              <div key={p.label} className="metric-row">
                <span className="text-[14px] text-charcoal">{p.label}</span>
                <span className="font-mono text-[13px] text-muted">{p.value}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section n="09" title="AI Runtime" aside="inativo">
          <div className="card system-card">
            <p className="page-subtitle italic">
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
