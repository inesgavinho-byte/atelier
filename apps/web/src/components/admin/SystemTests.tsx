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
  success: "success",
  warning: "warning",
  failure: "danger",
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
        <button type="button" className="button primary" onClick={runAll}>
          Correr todos
        </button>
      </div>
      <div>
        {TESTS.map((t) => {
          const r = results[t.key];
          return (
            <div key={t.key} className="test-row">
              <button
                type="button"
                className="button"
                onClick={() => run(t)}
                disabled={running === t.key}
              >
                {running === t.key ? "A correr…" : t.label}
              </button>
              {r ? (
                <div className="flex items-center gap-3 text-[12.5px]">
                  <span className="inline-flex items-center gap-2">
                    <span className={`dot ${STATUS_DOT[r.status]}`} />
                    <span>{r.status}</span>
                  </span>
                  <span className="text-muted">{r.ms} ms</span>
                  <span className="text-muted font-mono break-all">
                    {r.detail}
                  </span>
                </div>
              ) : (
                <span className="text-muted text-[12.5px] italic">
                  por correr
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
