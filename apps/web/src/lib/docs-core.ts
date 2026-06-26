/**
 * ATELIER — Markdown document core
 *
 * Shared building blocks for the internal document libraries (the
 * constitutional library at /atelier and the product backlog at /product).
 * Documents are read directly from markdown files at the repository root —
 * the files are the single source of truth. Nothing is duplicated.
 */

import fs from "node:fs";
import path from "node:path";

export interface DocMeta {
  id?: string;
  title?: string;
  version?: string;
  status?: string;
  owner?: string;
  created?: string;
  updated?: string;
}

/** Resolve the repository root from the web app's working directory. */
export function repoRoot(): string {
  // `next build` runs with cwd = apps/web; the foundation lives two levels up.
  // Walk up until we find the `atelier/` folder so this is resilient to cwd.
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "atelier"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to the conventional layout.
  return path.resolve(process.cwd(), "..", "..");
}

/** Minimal frontmatter parser — avoids an extra dependency. */
export function parseFrontmatter(raw: string): { meta: DocMeta; body: string } {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };

  const lines = raw.split(/\r?\n/);
  // First line is the opening "---"; find the closing "---".
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { meta: {}, body: raw };

  const meta: DocMeta = {};
  const scalarKeys: (keyof DocMeta)[] = [
    "id",
    "title",
    "version",
    "status",
    "owner",
    "created",
    "updated",
  ];
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1] as keyof DocMeta;
    const value = m[2].trim();
    if (scalarKeys.includes(key) && value) {
      meta[key] = value;
    }
  }

  const body = lines.slice(end + 1).join("\n").replace(/^\s+/, "");
  return { meta, body };
}

/** Read a markdown file (relative to the repo root) and split frontmatter. */
export function loadMarkdown(relativePath: string): {
  meta: DocMeta;
  body: string;
} {
  const raw = fs.readFileSync(path.join(repoRoot(), relativePath), "utf8");
  return parseFrontmatter(raw);
}

/** Previous/next neighbours by position in an ordered list. */
export function neighboursOf<T>(
  list: T[],
  index: number
): { prev?: T; next?: T } {
  if (index < 0) return {};
  return {
    prev: index > 0 ? list[index - 1] : undefined,
    next: index < list.length - 1 ? list[index + 1] : undefined,
  };
}
