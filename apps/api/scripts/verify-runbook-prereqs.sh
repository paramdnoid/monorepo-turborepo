#!/usr/bin/env bash
# Schnellcheck ohne Keycloak-Token: API erreichbar, DB ready.
# Voraussetzung: API läuft (pnpm exec turbo run dev --filter=api).
# Siehe: apps/api/KEYCLOAK-E2E-RUNBOOK.md
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:4000}"
API_BASE="${API_BASE%/}"

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" "$1"
}

code=$(http_code "$API_BASE/health")
if [ "$code" != "200" ]; then
  echo "FAIL GET $API_BASE/health -> HTTP $code (API läuft?)"
  exit 1
fi
echo "OK GET $API_BASE/health"

code=$(http_code "$API_BASE/ready")
if [ "$code" != "200" ]; then
  echo "FAIL GET $API_BASE/ready -> HTTP $code (Postgres + DATABASE_URL für api? Migration?)"
  exit 1
fi
echo "OK GET $API_BASE/ready"

echo ""
echo "Nächste Schritte: Token + Org → KEYCLOAK-E2E-RUNBOOK.md; Web: DATABASE_URL für Mandanten-Provision."
