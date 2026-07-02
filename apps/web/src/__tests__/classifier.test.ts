import { describe, it, expect } from "vitest";
import { classifyMessage, isComplexQuestion } from "@/lib/ai-runtime/classifier";

/**
 * The classifier is pure rules with a fixed priority order (first cue match
 * wins). These inputs are chosen to be unambiguous for each of the 8 task
 * types in both PT and EN — note that the cue order means some phrasings
 * collide (e.g. "escreve um …" matches the *code* cue "escreve um", and
 * "… este texto" matches the *writing* cue "texto"), so we avoid those here.
 */
describe("classifyMessage — 8 task types (PT + EN)", () => {
  const cases: [string, string, ReturnType<typeof classifyMessage>][] = [
    ["writing PT", "redige um email para o cliente", "writing"],
    ["writing EN", "write a newsletter draft", "writing"],
    ["code PT", "implementa uma função typescript", "code"],
    ["code EN", "fix the bug in this script", "code"],
    ["search PT", "pesquisa sobre mereologia", "search"],
    ["search EN", "search the web for papers", "search"],
    ["brainstorming PT", "faz brainstorm de ideias novas", "brainstorming"],
    ["brainstorming EN", "brainstorm ideas for the launch", "brainstorming"],
    ["summary PT", "faz um resumo desta conversa", "summary"],
    ["summary EN", "summarize the meeting notes", "summary"],
    ["reasoning PT", "analisa os prós e contras", "reasoning"],
    ["reasoning EN", "evaluate the trade-offs", "reasoning"],
    ["planning PT", "planeia o próximo sprint", "planning"],
    ["planning EN", "plan the next sprint", "planning"],
    ["general PT", "olá, como estás?", "general"],
    ["general EN", "hello, how are you?", "general"],
    ["github_read URL", "lê https://github.com/inesgavinho-byte/atelier", "github_read"],
    ["github_read readme", "mostra o readme do DECIMA", "github_read"],
  ];

  for (const [label, input, expected] of cases) {
    it(`${label}: "${input}" → ${expected}`, () => {
      expect(classifyMessage(input)).toBe(expected);
    });
  }

  it("is case-insensitive", () => {
    expect(classifyMessage("PESQUISA sobre X")).toBe("search");
  });

  it("documents cue precedence: code cues win over writing for 'escreve um …'", () => {
    // "escreve um" is a code cue checked before the writing rules — a real
    // nuance of the current rules, locked here against silent regression.
    expect(classifyMessage("escreve um email")).toBe("code");
  });
});

describe("isComplexQuestion", () => {
  it("flags a long multi-angle question", () => {
    expect(
      isComplexQuestion(
        "Devo investir mais no PAPERS ou no NUDO este trimestre, quais os prós e contras?"
      )
    ).toBe(true);
  });
  it("ignores short greetings", () => {
    expect(isComplexQuestion("olá")).toBe(false);
  });
});
