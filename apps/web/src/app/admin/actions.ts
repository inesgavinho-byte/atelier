"use server";

import { getSupabase } from "@/lib/supabase";
import { getSearchCorpus } from "@/lib/mission";
import type { TestResult } from "@/lib/diagnostics";

/**
 * Section 6 — system tests. Each runs a real operation, times it, and returns
 * success / warning / failure with details. Never throws to the client.
 */

async function timed(
  fn: () => Promise<{ status: TestResult["status"]; detail: string }>
): Promise<TestResult> {
  const t0 = performance.now();
  try {
    const r = await fn();
    return { ...r, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return {
      status: "failure",
      ms: Math.round(performance.now() - t0),
      detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  }
}

async function count(table: string): Promise<TestResult> {
  return timed(async () => {
    const sb = getSupabase();
    if (!sb) return { status: "failure", detail: "Cliente Supabase não configurado." };
    const { count, error } = await sb
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return { status: "failure", detail: error.message };
    return { status: "success", detail: `${count ?? 0} registo(s)` };
  });
}

export async function testDatabase(): Promise<TestResult> {
  return count("initiatives");
}
export async function testAgents(): Promise<TestResult> {
  return count("agents");
}
export async function testDecisions(): Promise<TestResult> {
  return count("decisions");
}
export async function testTimeline(): Promise<TestResult> {
  return count("activity");
}

export async function testSearch(): Promise<TestResult> {
  return timed(async () => {
    const corpus = await getSearchCorpus();
    return {
      status: corpus.length > 0 ? "success" : "warning",
      detail: `${corpus.length} itens indexados`,
    };
  });
}

export async function testStorage(): Promise<TestResult> {
  return timed(async () => {
    const sb = getSupabase();
    if (!sb) return { status: "failure", detail: "Cliente Supabase não configurado." };
    const { data, error } = await sb.storage.listBuckets();
    if (error) return { status: "warning", detail: error.message };
    return { status: "success", detail: `${data?.length ?? 0} bucket(s)` };
  });
}

export async function testCapture(): Promise<TestResult> {
  return timed(async () => {
    const sb = getSupabase();
    if (!sb) return { status: "failure", detail: "Cliente Supabase não configurado." };
    // Round trip: insert a probe, then remove it.
    const probe = "__diagnostics_probe__";
    const ins = await sb
      .from("captures")
      .insert({ kind: "nota", value: probe })
      .select("id")
      .single();
    if (ins.error) return { status: "failure", detail: `insert: ${ins.error.message}` };
    const del = await sb.from("captures").delete().eq("id", ins.data.id);
    if (del.error)
      return { status: "warning", detail: `escrita ok, limpeza falhou: ${del.error.message}` };
    return { status: "success", detail: "Escrita e limpeza ok (round-trip)" };
  });
}
