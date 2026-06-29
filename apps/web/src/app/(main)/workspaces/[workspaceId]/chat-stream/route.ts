import { gateway } from "@/lib/ai/gateway";
import { runtime as aiRuntime } from "@/lib/ai-runtime/runtime";
import {
  prepareWorkspaceTurn,
  persistAssistantTurn,
  updateMessageMetadata,
} from "@/lib/workspace-chat";
import { suggestNextSteps } from "@/lib/ai/next-steps";
import type { StreamMeta } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Streaming chat endpoint (ADR-0004). Prepares the turn (same plumbing as the
 * blocking action), routes via the Council, and streams the assistant text as
 * it arrives. The full reply is persisted once the stream ends. Routing
 * metadata (model + task type) travels in response headers so the UI can label
 * the message. Falls back to a single blocking call if the stream yields
 * nothing (e.g. a provider that doesn't support SSE).
 */
export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    content?: string;
    projectId?: string;
  };
  const content = (body.content ?? "").trim();
  const projectId = body.projectId || undefined;
  if (!content) {
    return new Response("Mensagem vazia.", { status: 400 });
  }

  const prepared = await prepareWorkspaceTurn(params.workspaceId, content, projectId);
  if (!prepared.ok || !prepared.chatId || !prepared.messages) {
    return new Response(prepared.error ?? "Falha ao preparar a conversa.", {
      status: 400,
    });
  }

  const plan = aiRuntime.plan({
    workspaceName: prepared.workspaceName,
    projectName: prepared.projectName,
    messages: prepared.messages,
  });

  const chatId = prepared.chatId;
  const ctxVersion = prepared.ctxVersion ?? null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      let meta: StreamMeta = {};
      const t0 = Date.now();
      try {
        for await (const chunk of gateway.stream(
          {
            provider: plan.provider,
            messages: plan.messages,
            model: plan.model,
            temperature: plan.temperature,
          },
          (m) => {
            meta = m;
          }
        )) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        // Fallback: provider didn't stream — do one blocking call.
        if (!full) {
          const res = await gateway.run({
            provider: plan.provider,
            messages: plan.messages,
            model: plan.model,
            temperature: plan.temperature,
          });
          if (res.ok && res.text) {
            full = res.text;
            if (res.tokens != null) meta = { ...meta, tokens: res.tokens };
            controller.enqueue(encoder.encode(res.text));
          } else {
            const msg = `\n[O provider ${plan.provider} não respondeu: ${res.error ?? "erro"}]`;
            controller.enqueue(encoder.encode(msg));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(encoder.encode(`\n[Erro: ${msg}]`));
      } finally {
        // Persist the assistant turn only when we produced real text, then
        // enrich it (citations + a cheap "next steps" pass) before closing.
        if (full.trim()) {
          const citations =
            plan.provider === "perplexity" ? (meta.citations ?? []) : [];
          const messageId = await persistAssistantTurn(chatId, {
            text: full,
            provider: plan.provider,
            model: plan.model ?? plan.provider,
            taskType: plan.taskType,
            tokens: meta.tokens ?? null,
            latencyMs: Date.now() - t0,
            ctxVersion,
            metadata: citations.length ? { citations } : {},
          });

          let steps: unknown[] = [];
          try {
            steps = await suggestNextSteps([
              ...plan.messages,
              { role: "assistant", content: full },
            ]);
          } catch {
            /* next-steps is best-effort */
          }
          if (messageId && (steps.length || citations.length)) {
            await updateMessageMetadata(messageId, {
              ...(citations.length ? { citations } : {}),
              ...(steps.length ? { steps } : {}),
            });
          }

          // Tell the client about the enrichments in one trailing line so the
          // message can show tokens/sources/next-steps without a round-trip.
          controller.enqueue(
            encoder.encode(
              "\n[[ATELIER_META]]" +
                JSON.stringify({
                  tokens: meta.tokens ?? null,
                  model: plan.model ?? plan.provider,
                  taskType: plan.taskType,
                  citations,
                  steps,
                })
            )
          );
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-provider": plan.provider,
      "x-model": plan.model ?? plan.provider,
      "x-task-type": plan.taskType,
    },
  });
}
