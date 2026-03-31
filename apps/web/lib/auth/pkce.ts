import { createHash } from "node:crypto";

/** Base64url(SHA256(verifier)) — wie OAuth PKCE S256. */
export function pkceS256Challenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier, "utf8").digest();
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

export function verifyPkceS256(verifier: string, codeChallenge: string): boolean {
  return pkceS256Challenge(verifier) === codeChallenge;
}
