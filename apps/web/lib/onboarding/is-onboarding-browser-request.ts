/**
 * Onboarding-APIs nur von derselben Origin und mit Referer unter `/onboarding/*` (CSRF/Embed-Schutz).
 */
export function isOnboardingBrowserRequest(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin || !referer) return false;

  let refererUrl: URL;
  try {
    refererUrl = new URL(referer);
  } catch {
    return false;
  }

  if (origin !== requestUrl.origin) return false;
  if (refererUrl.origin !== requestUrl.origin) return false;
  return refererUrl.pathname.startsWith("/onboarding");
}
