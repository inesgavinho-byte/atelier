---
title: Auditoria + planos estratégicos
date: 2026-06-30
---

# 090 — Auditoria + planos estratégicos

Snapshot honesto do estado do ATELIER/DECIMA a 2026-06-30 e quatro planos. Apenas
análise e documentos — **nada aqui está implementado**.

| Documento | Conteúdo |
|---|---|
| [AUDIT-2026-06-30.md](./AUDIT-2026-06-30.md) | Estado actual: tabelas, rotas, integrações, ADRs (código vs frontmatter), dívida técnica, gaps face à visão, métricas |
| [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) | O que falta para cada ADR/visão estar a 100%, por prioridade e esforço (S/M/L/XL) |
| [ROI-IMPROVEMENTS.md](./ROI-IMPROVEMENTS.md) | 15 melhorias por ROI (impacto vs esforço) — polish, infra subutilizada, bugs |
| [SCALABILITY-MULTITENANT.md](./SCALABILITY-MULTITENANT.md) | Escala x1000 + multi-tenant + sequência de migração faseada |
| [THIRD-PARTY-INTEGRATIONS.md](./THIRD-PARTY-INTEGRATIONS.md) | Ecossistema actual + OAuth genérico + MCP vs directo + Living Artifacts |

## Os três fossos entre "parece pronto" e "está pronto"

1. **Runtime de execução (ADR-0002)** — a fila `jobs` é real mas a execução é
   **simulada** (`worker.ts:66`). Sem subprocess, isolamento nem artefactos.
2. **Living Artifacts** — `artifact_revisions` tem **0 rows** e não há Google
   Workspace; a peça mais valiosa da visão não existe ainda.
3. **Multi-tenant / RLS** — 14 tabelas com RLS `USING (true)`; sem ownership. O
   modelo-alvo (ownership por Space) está na visão mas não no schema.

Pré-requisito de quase tudo o resto: **migrar embeddings JSONB → pgvector**.
