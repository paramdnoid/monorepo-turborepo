#!/usr/bin/env bash
# Phase 1: Prächeck (immer) + optional Keycloak-E2E, wenn ACCESS_TOKEN gesetzt.
# Von Repo-Root: pnpm --filter api run runbook:phase1
# Mit Token: ACCESS_TOKEN="…" pnpm --filter api run runbook:phase1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "==> Schritt 1 — API erreichbar, DB bereit (/health, /ready)"
bash scripts/verify-runbook-prereqs.sh

echo ""
if [[ -z "${ACCESS_TOKEN:-}" ]]; then
  echo "==> Schritt 2 — Keycloak-E2E: noch kein ACCESS_TOKEN"
  echo "    Token beschaffen (siehe KEYCLOAK-E2E-RUNBOOK.md §4), Mandant in organizations (§3), dann:"
  echo "    ACCESS_TOKEN=\"…\" pnpm --filter api run runbook:phase1"
  echo "    (oder nur: ACCESS_TOKEN=\"…\" pnpm --filter api run e2e:keycloak)"
  echo ""
  echo "==> Schritt 3 — Web: DATABASE_URL in Staging/Prod (gleiche DB wie API) — apps/web/AGENTS.md"
  exit 0
fi

echo "==> Schritt 2 — GET /v1/me + POST /v1/sync (echtes Token)"
pnpm run e2e:keycloak
