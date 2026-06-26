import { getSupabase } from "@/lib/supabase";

/**
 * TEMPORARY diagnostic page (/debug). Walks the chain
 *   Netlify ENV → Supabase client → connection → SQL → RLS → data
 * and reports where it breaks. Never reveals the key — only presence and type.
 * Remove once the deploy reads Supabase correctly.
 */
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Debug — ATELIER",
  robots: { index: false, follow: false },
};

function keyType(k?: string | null): string {
  if (!k) return "ausente";
  if (k.startsWith("sb_publishable_")) return "publishable (sb_publishable_…)";
  if (k.startsWith("sb_secret_")) return "secret (sb_secret_… — NÃO usar no cliente)";
  if (k.startsWith("eyJ")) return "legacy anon JWT (eyJ…)";
  return "formato desconhecido";
}

export default async function DebugPage() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? null;
  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    null;
  const usingPublicName = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const rows: { k: string; v: string }[] = [];
  rows.push({ k: "1. ENV — NEXT_PUBLIC_SUPABASE_URL presente", v: process.env.NEXT_PUBLIC_SUPABASE_URL ? "sim" : "NÃO" });
  rows.push({ k: "1. ENV — SUPABASE_URL (fallback) presente", v: process.env.SUPABASE_URL ? "sim" : "não" });
  rows.push({ k: "1. ENV — NEXT_PUBLIC_SUPABASE_ANON_KEY presente", v: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "sim" : "NÃO" });
  rows.push({ k: "1. ENV — chave usada (nome)", v: usingPublicName ? "NEXT_PUBLIC_*" : process.env.SUPABASE_URL ? "SUPABASE_* (fallback)" : "nenhuma" });
  rows.push({ k: "5. Projeto (URL completo — não é segredo)", v: url ?? "—" });
  rows.push({ k: "Tipo de chave (sem revelar)", v: keyType(rawKey) });

  const sb = getSupabase();
  rows.push({ k: "2. Cliente Supabase", v: sb ? "criado ✅" : "null — ENV em falta ❌" });

  let errMsg = "";
  if (sb) {
    // 3 + 4 — server-side SELECT through the anon key (exercises RLS)
    let connection = "n/a";
    let sample = "—";
    try {
      const { data, error } = await sb
        .from("initiatives")
        .select("*")
        .limit(1);
      if (error) {
        connection = "ERRO ❌";
        errMsg = `message="${error.message}" | code="${error.code}" | details="${error.details}" | hint="${error.hint}"`;
      } else {
        connection = "OK ✅";
        sample = JSON.stringify(data?.[0] ?? null);
      }
    } catch (e) {
      connection = "EXCEÇÃO ❌";
      errMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
    rows.push({ k: "3+4. select * from initiatives limit 1 (via anon key → RLS)", v: connection });
    rows.push({ k: "Amostra (1ª iniciativa)", v: sample });

    const countOf = async (t: string): Promise<string> => {
      try {
        const { count, error } = await sb
          .from(t)
          .select("*", { count: "exact", head: true });
        return error ? `erro: ${error.message}` : String(count ?? 0);
      } catch (e) {
        return `exceção: ${e instanceof Error ? e.message : String(e)}`;
      }
    };
    rows.push({ k: "6. Nº iniciativas", v: await countOf("initiatives") });
    rows.push({ k: "6. Nº agentes", v: await countOf("agents") });
    rows.push({ k: "6. Nº decisões", v: await countOf("decisions") });
  }

  if (errMsg) rows.push({ k: "Erro completo", v: errMsg });

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px" }}>
      <h1 className="font-serif text-3xl">Debug — cadeia Supabase</h1>
      <p className="meta mt-2">
        Página temporária. Netlify ENV → Cliente → Ligação → SQL → RLS → Dados.
      </p>
      <table className="mt-8 w-full border-collapse text-[13px]">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line align-top">
              <td className="py-2 pr-6 text-muted">{r.k}</td>
              <td className="py-2 font-mono break-all text-charcoal">{r.v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
