"use client";

import { useState, useTransition } from "react";
import type { TestResult } from "@/lib/diagnostics";
import {
  testAgents,
  testCapture,
  testDatabase,
  testDecisions,
  testSearch,
  testStorage,
  testTimeline,
} from "@/app/admin/actions";

const TESTS: { key: string; label: string; run: () => Promise<TestResult> }[] = [
  { key: "db", label: "Test Database", run: testDatabase },
  { key: "search", label: "Test Search", run: testSearch },
  { key: "storage", label: "Test Storage", run: testStorage },
  { key: "capture", label: "Test Capture", run: testCapture },
  { key: "decisions", label: "Test Decisions", run: testDecisions },
  { key: "timeline", label: "Test Timeline", run: testTimeline },
  { key: "agents", label: "Test Agents", run: testAgents },
];

const STATUS_DOT: Record<TestResult["status"], string> = {
  success: "bg-olive",
  warning: "bg-beige",
  failure: "bg-charcoal",
};

export default function SystemTests() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (t: (typeof TESTS)[number]) => {
    setRunning(t.key);
    startTransition(async () => {
      const r = await t.run();
      setResults((prev) => ({ ...prev, [t.key]: r }));
      setRunning(null);
    });
  };

  const runAll = () => {
    TESTS.forEach((t) => run(t));
  };

  return (
    <div>
      <div className="mb-5">
        <button type="button" className="action" onClick={runAll}>
          Correr todos
        </button>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {TESTS.map((t) => {
          const r = results[t.key];
          return (
            <li
              key={t.key}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="action"
                  onClick={() => run(t)}
                  disabled={running === t.key}
                >
                  {running === t.key ? "A correr…" : t.label}
                </button>
              </div>
              {r ? (
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="inline-flex items-center gap-2">
                    <span className={`dot ${STATUS_DOT[r.status]}`} />
                    <span className="text-charcoal">{r.status}</span>
                  </span>
                  <span className="meta">{r.ms} ms</span>
                  <span className="meta font-mono break-all">{r.detail}</span>
                </div>
              ) : (
                <span className="meta italic">por correr</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
