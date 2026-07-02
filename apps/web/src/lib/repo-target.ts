/**
 * Detect which GitHub repo a message refers to (OI github_read). Pure and
 * client-safe (no server-only imports) so it's cheap to unit-test.
 */
const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/**
 * Returns "owner/repo" when the message contains a github.com URL, mentions a
 * repo-linked workspace by name, or carries a bare owner/repo token that maches
 * a known repo. Otherwise null.
 */
export function detectRepoTarget(
  content: string,
  repoWorkspaces: { name: string; githubRepo: string }[]
): string | null {
  const urlMatch = content.match(
    /github\.com\/([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)/i
  );
  if (urlMatch) return urlMatch[1].replace(/\.git$/i, "");

  const lower = content.toLowerCase();
  for (const w of repoWorkspaces) {
    if (w.name.length >= 3 && lower.includes(w.name.toLowerCase()))
      return w.githubRepo;
  }
  const bare = content.match(/\b([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)\b/);
  if (bare && REPO_RE.test(bare[1])) {
    const known = repoWorkspaces.find(
      (w) => w.githubRepo.toLowerCase() === bare[1].toLowerCase()
    );
    if (known) return known.githubRepo;
  }
  return null;
}
