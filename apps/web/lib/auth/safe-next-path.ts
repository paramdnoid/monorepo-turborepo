/**
 * Nur relative interne Pfade — verhindert Open-Redirect über `next`.
 */
export function safeNextPath(next: string | undefined): string | null {
  if (!next) {
    return null;
  }
  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}
