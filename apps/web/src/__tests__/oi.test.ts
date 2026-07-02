import { describe, it, expect } from "vitest";
import { detectRepoTarget } from "@/lib/repo-target";

const REPOS = [
  { name: "DECIMA", githubRepo: "inesgavinho-byte/DECIMA" },
  { name: "WORKSPACE", githubRepo: "inesgavinho-byte/atelier" },
];

describe("detectRepoTarget (OI github_read)", () => {
  it("extracts owner/repo from a github.com URL", () => {
    expect(
      detectRepoTarget("vê https://github.com/foo/bar por favor", REPOS)
    ).toBe("foo/bar");
  });

  it("strips a trailing .git", () => {
    expect(detectRepoTarget("git clone https://github.com/foo/bar.git", REPOS)).toBe(
      "foo/bar"
    );
  });

  it("resolves a workspace mentioned by name to its repo", () => {
    expect(detectRepoTarget("o que se passa no DECIMA?", REPOS)).toBe(
      "inesgavinho-byte/DECIMA"
    );
  });

  it("returns null when nothing matches", () => {
    expect(detectRepoTarget("olá, tudo bem?", REPOS)).toBeNull();
  });
});
