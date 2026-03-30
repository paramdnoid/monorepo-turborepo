import { createMiddleware } from "hono/factory";

/**
 * Setzt `X-Request-Id` (übernehmen oder neu) und schreibt eine JSON-Logzeile nach der Antwort.
 */
export function requestContextMiddleware() {
  return createMiddleware(async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);

    const start = Date.now();
    await next();
    const durationMs = Date.now() - start;
    const path = new URL(c.req.url).pathname;
    const auth = c.get("auth");

    console.log(
      JSON.stringify({
        level: "info",
        service: "zunftgewerk-api",
        requestId,
        method: c.req.method,
        path,
        status: c.res.status,
        durationMs,
        ...(auth ? { tenantId: auth.tenantId } : {}),
      }),
    );
  });
}
