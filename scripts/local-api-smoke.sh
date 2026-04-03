#!/usr/bin/env bash
# Lokaler Ablauf: Postgres (Docker) → Migration → HTTP-Smoke (Mock-JWT; Mandant wird im Smoke angelegt).
# Nutzung:
#   ./scripts/local-api-smoke.sh
# Oder mit eigener URL:
#   DATABASE_URL='postgresql://...' ./scripts/local-api-smoke.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/zunftgewerk}"

echo "==> drizzle-kit migrate (@repo/db)"
pnpm --filter @repo/db exec drizzle-kit migrate

echo "==> HTTP-Smoke (Mock-JWT, gleiche DB wie .env.local)"
if [[ -f apps/api/.env.local ]]; then
  pnpm --filter api run smoke:http
else
  echo "Hinweis: apps/api/.env.local fehlt — Smoke mit DATABASE_URL aus der Shell:"
  export DATABASE_URL
  pnpm --filter api run smoke:http
fi

echo "Fertig. Für echtes Bearer-Token: Keycloak starten, AUTH_OIDC_ISSUER setzen, Token holen, dann:"
echo "  curl -sS -H \"Authorization: Bearer \$TOKEN\" http://127.0.0.1:4000/v1/me"
