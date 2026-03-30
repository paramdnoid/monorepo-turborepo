#!/usr/bin/env bash
# Holt ein Access-Token per Password-Grant vom lokalen Keycloak (nur Dev).
# Voraussetzung: Realm, Client (Direct Access Grants), User — siehe KEYCLOAK-E2E-RUNBOOK.md
#
#   export KEYCLOAK_BASE_URL=http://127.0.0.1:8080
#   export KEYCLOAK_REALM=zgwerk
#   export KEYCLOAK_CLIENT_ID=zunft-dev
#   export KEYCLOAK_USER=dev
#   export KEYCLOAK_PASSWORD=dev
#   pnpm --filter api run token:local
#
set -euo pipefail

BASE="${KEYCLOAK_BASE_URL:-http://127.0.0.1:8080}"
REALM="${KEYCLOAK_REALM:-zgwerk}"
CLIENT="${KEYCLOAK_CLIENT_ID:-zunft-dev}"
USER="${KEYCLOAK_USER:-dev}"
PASS="${KEYCLOAK_PASSWORD:-dev}"

BASE="${BASE%/}"
URL="${BASE}/realms/${REALM}/protocol/openid-connect/token"

curl -sS -X POST "$URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=${CLIENT}&username=${USER}&password=${PASS}&scope=openid" \
| node -e "
const b = require('fs').readFileSync(0, 'utf8');
let j;
try { j = JSON.parse(b); } catch (e) {
  console.error('Kein JSON von Keycloak:', b);
  process.exit(1);
}
if (j.access_token) { console.log(j.access_token); process.exit(0); }
const msg = [j.error, j.error_description].filter(Boolean).join(': ') || b;
console.error(msg);
process.exit(1);
"
