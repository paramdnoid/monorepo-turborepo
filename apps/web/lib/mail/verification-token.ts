import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SECONDS = 48 * 60 * 60;

export type VerificationTokenPayload = {
  sub: string;
  email: string;
  exp: number;
};

function getSecret(): string | null {
  return (
    process.env.AUTH_EMAIL_VERIFICATION_SECRET ??
    process.env.AUTH_PASSWORD_RESET_SECRET ??
    null
  );
}

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return Buffer.from(
    pad ? padded + "=".repeat(4 - pad) : padded,
    "base64",
  );
}

export function isEmailVerificationSecretConfigured(): boolean {
  return Boolean(getSecret()?.length);
}

export function signEmailVerificationToken(
  userId: string,
  email: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: VerificationTokenPayload = {
    sub: userId,
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(Buffer.from(payloadJson, "utf8"));
  const sig = createHmac("sha256", secret)
    .update(payloadB64)
    .digest();
  const sigB64 = base64urlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyEmailVerificationToken(
  token: string,
): VerificationTokenPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [payloadB64, sigB64] = parts;
  const expectedSig = createHmac("sha256", secret)
    .update(payloadB64)
    .digest();
  let providedSig: Buffer;
  try {
    providedSig = base64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (
    expectedSig.length !== providedSig.length ||
    !timingSafeEqual(expectedSig, providedSig)
  ) {
    return null;
  }

  let payload: VerificationTokenPayload;
  try {
    payload = JSON.parse(
      base64urlDecode(payloadB64).toString("utf8"),
    ) as VerificationTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
