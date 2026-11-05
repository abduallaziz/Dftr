/** The URL is just "/<token>" - no role words, nothing guessable. Tokens are >= 40 URL-safe characters. */
const TOKEN_PATH = /^\/([A-Za-z0-9_-]{40,256})\/?$/;

export function tokenFromPath(pathname: string): string | null {
  return TOKEN_PATH.exec(pathname)?.[1] ?? null;
}
