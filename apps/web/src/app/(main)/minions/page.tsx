import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getMinions,
  getMinionSignals,
  getPendingSignals,
  type MinionSignal,
} from "@/lib/minions";
import MinionsBoard from "@/components/minions/MinionsBoard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minions — ATELIER" };

/**
 * Minions — the operator's invisible preparation team (EPIC-003). Minions and
 * their signals are RLS-locked to the service role, so the list is read
 * server-side via getSupabaseAdmin and shows a clear empty state when the
 * service role isn't configured.
 */
export default async function MinionsPage() {
  const admin = getSupabaseAdmin();

  if (!admin) {
    return (
      <div>
        <header className="mb-10">
          <p className="atelier-date">Ferramentas</p>
          <h1 className="atelier-title">Minions</h1>
          <p className="atelier-subtitle">
            A tua equipa invisível de preparação.
          </p>
        </header>
        <p className="panel p-4 meta">
          Define SUPABASE_SERVICE_ROLE_KEY no ambiente para ver os Minions (as
          tabelas estão fechadas por RLS ao service role).
        </p>
      </div>
    );
  }

  const [minions, pendingSignals] = await Promise.all([
    getMinions(),
    getPendingSignals(),
  ]);

  // Recent signals per minion for the drawer (few minions ⇒ cheap).
  const entries = await Promise.all(
    minions.map(
      async (m) => [m.id, await getMinionSignals(m.id, 10)] as const
    )
  );
  const signalsByMinion: Record<string, MinionSignal[]> = Object.fromEntries(
    entries
  );

  return (
    <div>
      <header className="mb-10">
        <p className="atelier-date">Ferramentas</p>
        <h1 className="atelier-title">Minions</h1>
        <p className="atelier-subtitle">
          A tua equipa invisível de preparação. Observam, organizam e propõem —
          nunca decidem sozinhos.
        </p>
      </header>

      {minions.length === 0 ? (
        <p className="panel p-4 meta">Ainda não há Minions configurados.</p>
      ) : (
        <MinionsBoard
          minions={minions}
          pendingSignals={pendingSignals}
          signalsByMinion={signalsByMinion}
        />
      )}
    </div>
  );
}
