/**
 * The AI Runtime uses the gateway's providers — a single implementation of the
 * AIProvider contract. Re-exported here so the runtime's provider surface is
 * explicit without duplicating the vendor HTTP logic.
 */
export { openaiProvider } from "@/lib/ai/providers/openai";
