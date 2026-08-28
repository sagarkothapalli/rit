/** Hosted static export cannot serve UUID case routes; use the query-param workspace. */
export function isStaticHost(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_HOST === "1";
}

export function casePath(id: string, leaf?: string): string {
  if (isStaticHost()) {
    const query = new URLSearchParams({ id });
    if (leaf) query.set("p", leaf);
    return `/cases/open?${query.toString()}`;
  }
  return leaf ? `/cases/${encodeURIComponent(id)}/${leaf}` : `/cases/${encodeURIComponent(id)}`;
}

export function parseCaseWorkspacePath(pathname: string): { id: string; leaf?: string } | null {
  const match = pathname.match(
    /^\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/([a-z0-9-]+))?\/?$/i,
  );
  if (!match) return null;
  return { id: match[1], leaf: match[2] };
}
