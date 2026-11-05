const encoder = new TextEncoder();

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(s)));
}

/** Constant-time comparison of the supplied token against the secret (hash both, XOR-compare). */
export async function tokenMatches(supplied: string | null, secretEnvName: string): Promise<boolean> {
  const secret = Deno.env.get(secretEnvName);
  // Refuse to run if the secret is missing or weak, so a misconfiguration never opens access.
  if (!secret || secret.length < 40 || !supplied) return false;
  const [a, b] = await Promise.all([sha256(supplied), sha256(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
