# Doc ↔ Code Verifikation — Maler & Lackierer

**Stand:** 2026-04-07 (Nachziehen: Mahn-E-Mail-Outbox)  
**Grundlage:** [`.cursor/maler-lackierer-modul-funktionsluecken.md`](./maler-lackierer-modul-funktionsluecken.md), [`.cursor/maler-lackierer-roadmap-epics.md`](./maler-lackierer-roadmap-epics.md), [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md)

**Methode:** Abgleich dokumentierter Claims mit `packages/db/src/schema.ts`, `apps/api/src/app.ts`, BFF unter `apps/web/app/api/web/`, ausgewählte UI-Routen und gezielte Volltextsuche.

---

## Status-Baseline (E-01 bis E-13)

Diese Tabelle ist die **Referenz** für den Reifegrad-Status in den drei anderen `.cursor`-Dokumenten. Der Reifegrad ist **produkt-/flussbezogen** (nicht nur „Endpunkte existieren“).

| Epic | Reifegrad | Kurzstatus (Code-Stand) | Nachweis (in dieser Datei) |
|------|-----------|--------------------------|-----------------------------|
| **E-01** | umgesetzt | Projekt ↔ Kunde ↔ Baustelle via `projects.customerId` + `projects.siteAddressId` | Matrix E-01 |
| **E-02** | in Arbeit | Projekt-Hub v1–v3 inkl. KPI-/Mini-Pipeline, 30-Tage-Segmente/Trends und KPI-UI-Polish geliefert; weitere KPIs/Widgets optional | Matrix E-02 |
| **E-03** | in Arbeit | Kunden-Defaults (Zahlungsziel/Skonto/Mahnfristen) geliefert; Vertiefung (z. B. Kreditlimit) offen | Matrix E-03 |
| **E-04** | in Arbeit | Scheduling mit `projectId` + Zeitraumfilter (`dateFrom`/`dateTo`) geliefert; Konflikte/Serien/Sollstunden offen | Matrix E-04 |
| **E-05** | in Arbeit | Zeiterfassung Web/API (`work_time_entries`, CRUD) geliefert; Soll/Ist + Auswertung offen | Matrix E-05 |
| **E-06** | in Arbeit | OP/Teilzahlungen/Mahnungen/Templates + CAMT-Match/Import + Sammelzahlungen + **Mahn-E-Mail-Outbox** geliefert; Betrieb/Monitoring/Automatisierung offen | Matrix E-06 + Mail (unten) |
| **E-07** | teilweise umgesetzt | Angebots-/Rechnungsbasis da; Steuer/Rabatt/Teilrechnungsketten offen | Offene Claims: E-07 |
| **E-08** | teilweise umgesetzt | Audit-/Lifecycle-Vorstufe da; Finalisierung/Snapshot/Sperren offen | Offene Claims: E-08 |
| **E-09** | teilweise umgesetzt | DATEV Settings + Buchungs-CSV vorhanden; XRechnung/ZUGFeRD-Endpunkte vorhanden, Standardtiefe/Profil-Konformität offen | Offene Claims: E-09 |
| **E-10** | teilweise umgesetzt | Maler-Module/GAEB/Assets teils da; End-to-End-Integration unvollständig (z. B. Flächenberechnung weiterhin `localStorage`) | Stichprobe: E-10 & E-11 |
| **E-11** | teilweise vorbereitet | Katalog-/Import-Bausteine vorhanden; operativer Bestell-/WE-Fluss offen (nicht tief verifiziert) | Stichprobe: E-10 & E-11 |
| **E-12** | offen | optional/späterer Scope | — |
| **E-13** | teilweise umgesetzt | Rollen/Audit/Offline-Bausteine teils da; zentrale Audit-Sicht und verbindliche Offline-Strategie offen | Stichprobe: E-13 |

---

## Matrix E-01 bis E-06 (Kern „geliefert“)

| Epic     | Doc-Claim (Kurz)                                                      | Code-Nachweis                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Bemerkung                                                                                                                                |
| -------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **E-01** | Projekt ↔ Kunde ↔ Baustelle (`customerId`, Baustellenadresse)         | `projects.customerId`, `projects.siteAddressId` in [`packages/db/src/schema.ts`](../packages/db/src/schema.ts); `GET/PATCH /v1/projects`, `GET /v1/projects/:id` in [`apps/api/src/app.ts`](../apps/api/src/app.ts)                                                                                                                                                                                                                                                         | Stimmt mit Doku überein.                                                                                                                 |
| **E-02** | Projekt-Hub, Belege, 7-Tage-Termine, Zeiterfassung, OP, Mahnungsbezug + KPI/Pipeline + 30-Tage-Trends + KPI-UI-Polish | [`apps/web/app/web/projects/[projectId]/page.tsx`](../apps/web/app/web/projects/[projectId]/page.tsx), Hub-Logik in [`project-hub-content.tsx`](../apps/web/components/web/projects/project-hub-content.tsx); Scheduling-Filter `dateFrom`/`dateTo` in [`apps/api/src/routes/scheduling.ts`](../apps/api/src/routes/scheduling.ts); Aggregation in [`apps/api/src/routes/projects.ts`](../apps/api/src/routes/projects.ts) | **`GET /v1/projects/:id/hub`:** vorhanden (API + BFF) und von der Hub-Seite als primärer Call genutzt; KPI-/Mini-Pipeline mit Progress/Conversion sowie 30-Tage-Segmente (`last30Days`/`previous30Days`) inkl. Trends sind im Payload und UI verdrahtet; **Hub-KPI-Karte** mit Sektionen, Reihenfolge und Mobile-Verbesserungen umgesetzt; optional weitere Segmenttiefe/Backlog. |
| **E-03** | Zahlungsziel, Skonto, Mahnfristen-Defaults am Kunden                  | Spalten u. a. `paymentTermsDays`, `reminderLevel1DaysAfterDue`–`3` auf `customers` im Schema; Customer-PATCH über API                                                                                                                                                                                                                                                                                                                                                       | Stimmt.                                                                                                                                  |
| **E-04** | Termine mit `project_id`, Listenfilter Zeitraum                       | `scheduling_assignments.projectId`; `GET /v1/scheduling/assignments` mit `dateFrom`/`dateTo` (max. 31 Tage) und `projectId` in `scheduling.ts`                                                                                                                                                                                                                                                                                                                              | Stimmt.                                                                                                                                  |
| **E-05** | Zeiterfassung Web/API                                                 | Tabelle `work_time_entries`; `/v1/work-time/entries` CRUD in `app.ts`; BFF [`apps/web/app/api/web/work-time/entries/`](../apps/web/app/api/web/work-time/entries/)                                                                                                                                                                                                                                                                                                          | Stimmt.                                                                                                                                  |
| **E-06** | OP, Teilzahlungen, Mahnungen, Templates, CAMT, Sammelzahlung          | Tabellen `sales_invoice_payments`, `sales_invoice_reminders`, `sales_reminder_templates`, `sales_camt_import_batches`/`lines`; Routen in `app.ts`: `open-items`, `open-items/export`, `camt-match`, `camt-import`, `camt-imports`, `payments/batch`, `reminder-templates`; BFF spiegelt u. a. [`sales/invoices/open-items`](../apps/web/app/api/web/sales/invoices/open-items/route.ts), [`payments/batch`](../apps/web/app/api/web/sales/invoices/payments/batch/route.ts) | Stimmt. Verträge: [`packages/api-contracts/src/sales.ts`](../packages/api-contracts/src/sales.ts) (u. a. offene Posten, Batch-Payments). |

---

## Offene / teilweise Claims (E-07 bis E-09, Mail)

| Thema                                                            | Doc-Status                  | Code-Befund                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **E-07 Belegtiefe** (Steuer split, Rabatte, Teilrechnungsketten) | teilweise / Tiefe offen     | `sales_invoice_lines` ohne USt-Satz pro Zeile — nur Gesamtlogik über Cent-Felder; keine `parent_invoice_id` o. ä. im Schema-Ausschnitt — **konsistent mit „offen“**.                                                                                                     |
| **E-08 GoBD**                                                    | Vorstufe                    | Tabelle `sales_lifecycle_events` (Archive/Cancel/Delete) vorhanden; kein durchgängiges „final + unveränderlicher Snapshot“-Modell in Schema — **konsistent mit Brief**.                                                                                                  |
| **E-09 XRechnung/ZUGFeRD**                                       | teilweise umgesetzt          | Endpunkte vorhanden: `GET /v1/sales/invoices/:id/xrechnung` und `GET /v1/sales/invoices/:id/zugferd` in [`apps/api/src/app.ts`](../apps/api/src/app.ts), Handler in [`apps/api/src/routes/sales.ts`](../apps/api/src/routes/sales.ts), BFF-Proxies unter [`apps/web/app/api/web/sales/invoices/[id]/`](../apps/web/app/api/web/sales/invoices/[id]/). Fachliche Standardtiefe bleibt offen. |
| **E-09 DATEV**                                                   | Basis produktiv             | [`apps/api/src/routes/datev.ts`](../apps/api/src/routes/datev.ts), `GET/PATCH /v1/datev/settings`, `GET /v1/datev/export/bookings.csv` — **konsistent**.                                                                                                                 |
| **E-06 Mail-Produktivität**                                      | Outbox + Audit + Retry + Cron-Entrypoint | Tabelle `sales_reminder_email_jobs`; API `POST/GET …/email-jobs`, `PATCH …/reminder-email-jobs/:jobId`, `POST …/reminder-email-jobs/:jobId/retry`, `POST …/reminder-email-jobs/process`, `GET …/reminder-email-jobs/metrics` in [`apps/api/src/app.ts`](../apps/api/src/app.ts); BFF inkl. [`email-queue/route.ts`](../apps/web/app/api/web/sales/invoices/[id]/reminders/[reminderId]/email-queue/route.ts), [`retry/route.ts`](../apps/web/app/api/web/sales/reminder-email-jobs/[jobId]/retry/route.ts), [`process/route.ts`](../apps/web/app/api/web/sales/reminder-email-jobs/process/route.ts); One-shot-Cron-Skript [`process-reminder-email-outbox.mts`](../apps/api/scripts/process-reminder-email-outbox.mts). |

---

## E-10 & E-11 (Stichprobe)

| Thema                 | Doc-Status                       | Code-Befund                                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **E-10 Maler-Module** | GAEB/Assets teils da; E2E-Lücke  | Painter-Segmente in [`painter-modules.ts`](../apps/web/lib/trades/painter-modules.ts); **Flächenberechnung** nutzt weiterhin **`localStorage`** in [`area-calculation-content.tsx`](../apps/web/components/web/painter/area-calculation-content.tsx) — **konsistent mit Analyse „nicht serverseitig mandantenbezogen“**. |
| **E-11 Material**     | Katalog-Bausteine, Prozess offen | `catalog/imports` API + Schema vorhanden (nicht tiefer verifiziert); durchgängiger Bestell-/WE-Fluss nicht Gegenstand dieser Stichprobe — Brief bleibt plausibel.                                                                                                                                                        |

---

## E-13 (Stichprobe)

| Thema              | Doc-Status      | Code-Befund                                                                                                                                                                             |
| ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Berechtigungen** | teilweise       | [`apps/web/lib/auth/web-permissions.ts`](../apps/web/lib/auth/web-permissions.ts) + Tests — Modul-Matrix vorhanden; **feingranular quer durch alle Domänen** nicht erschöpfend geprüft. |
| **Audit zentral**  | offen           | `sales_lifecycle_events` domain-spezifisch; keine zentrale Audit-UI — **konsistent mit „teilweise“**.                                                                                   |
| **Offline/Sync**   | Entscheid offen | `syncMutationReceipts` im Schema — **konsistent mit Doku („Schema vorhanden, Produktstrategie offen“)**.                                                                                |

---

## Tests & Smoke

| Claim                                   | Befund                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API-Smoke inkl. Mahntexte + CAMT-Import | [`apps/api/scripts/http-smoke-mock.mts`](../apps/api/scripts/http-smoke-mock.mts) Header-Kommentar listet u. a. Reminder-Templates und CAMT-Import — **bestätigt**. |
| Playwright E2E OP/Mahnung               | Keine Treffer zu `open-items`/`invoices/open`/`reminder` unter `packages/playwright-web` — **konsistent mit Roadmap „optional/offen“**.                             |

---

## Abweichungen / Drift

1. **Keine inhaltliche Widersprüchlichkeit** zwischen den drei `.cursor`-Dokumenten und dem geprüften Code zu den **als umgesetzt** markierten Kernpunkten E-01–E-06 und DATEV-Basis.
2. **`GET /v1/projects/:id/hub`** ist im Code vorhanden und aktiv ausgebaut (KPI-/Pipeline + 30-Tage-Segmente/Trends); KPI-UI-Polish ist in der Hub-Oberfläche umgesetzt; offen bleibt v. a. weitere Segmenttiefe oder zusätzliche KPIs nach Produktpriorität, nicht die Existenz des Endpunkts.
3. **Feinheiten** (z. B. vollständige Parität jedes BFF-Handlers mit `@repo/api-contracts`) wurden nicht Zeile für Zeile auditiert; bei neuen Endpunkten weiterhin Contract-First empfohlen.

---

## Optional nächste Schritte (keine Umsetzung hier)

- Bei Bedarf: Playwright-Szenario für OP-Liste oder Mahnungs-PDF (Roadmap-Optional).
- Doc-Update: Roadmap/Briefs/Analyse auf **2026-04-07** mit E-06 **Mahn-E-Mail-Outbox** abgeglichen.
