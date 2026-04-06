# Epic Initiative Briefs — Maler & Lackierer

**Stand:** 2026-04-06  
**Bezug:** [Funktionslücken](./maler-lackierer-modul-funktionsluecken.md) · [Epic-Roadmap](./maler-lackierer-roadmap-epics.md)

## Änderungsstand (vollständig abgeglichen)

- Alle Epic-Status auf den aktuellen Code-Stand harmonisiert (insb. E-06 v5-Basis sowie E-07 bis E-13).
- Inkonsistenz in E-05 bereinigt: Projektbezug bei Zeiterfassung ist **optional** (wie Schema/API), nicht Pflicht.
- E-06-V4-Iteration inkl. API-Smoke (`http-smoke-mock.mts`) als abgeschlossen dokumentiert; v5-Basis (E-Mail-/CAMT-Spike), **CAMT-Dateiimport** (Persistenz/Idempotenz/Historie), **Sammelzahlungen** (`POST …/payments/batch` + OP-UI) und **CAMT-Mehrfach-Prefill** ergänzt; Rest-Backlog **Mail-Produktivität** getrennt.

Zweck: **parallele Frontend-/Backend-Planung** — pro Epic ein gemeinsames Verständnis aus Problemraum, Erfolgskriterien, technischen Risiken (Spikes) und **MVP vs. Phase 2**.

**Legende Messgrößen:** Wo keine Produktanalytics existieren, sind **Proxy-Metriken** (manuell oder später Instrumentierung) vorgeschlagen.

---

## Umsetzungsreife (kompakt)

| Epic | Reifegrad | Fokus im nächsten Implementierungszug |
|------|-----------|----------------------------------------|
| **E-01** | umgesetzt | Stabilisieren/Backfill operativ abschließen |
| **E-02** | in Arbeit | Hub-v3: KPI/Pipeline oder Aggregations-Endpoint |
| **E-03** | in Arbeit | Kommerz-Defaults vertiefen (optional Kreditlimit) |
| **E-04** | in Arbeit | Konflikte/Serien/Sollstunden |
| **E-05** | in Arbeit | Soll/Ist + Auswertung |
| **E-06** | in Arbeit | Mail-Produktivität (Queue/Retry/Audit); CAMT-Spikes, Dateiimport persistiert, Sammelzahlung + CAMT-Mehrfach-Prefill geliefert |
| **E-07** | teilweise umgesetzt | Steuer-/Rabatt-/Teilrechnungslogik |
| **E-08** | teilweise umgesetzt | Finalisierung + Snapshot + Sperren |
| **E-09** | teilweise umgesetzt | XRechnung/ZUGFeRD + DATEV-Tiefe |
| **E-10** | teilweise umgesetzt | End-to-End-Übernahme in Angebotsfluss |
| **E-11** | teilweise vorbereitet | Bestellung/Wareneingang/Nachkalkulation |
| **E-12** | offen | späterer Scope |
| **E-13** | teilweise umgesetzt | zentrale Audit-/Permission-/Offline-Strategie |

---

## E-01 — Projekt ↔ Kunde ↔ Baustelle

**Status:** umgesetzt (2026-04-06)  
**Lieferung (MVP):** `projects.customerId` + `projects.siteAddressId`, validierte API, UI-Verknüpfung Stammkunde/Baustellenadresse, Safe-Backfill-Script (Dry-Run default).

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Projekte nutzen `customerLabel` als Freitext; Belege nutzen `customerId`. Dadurch entstehen Dubletten, keine verlässliche Auswertung „Umsatz je Kunde“, keine konsistente Adressübernahme bei Änderungen im Stammdaten-Objekt. |
| **Messgrößen** | (1) Anteil Projekte mit gesetztem `customerId` nach Migration. (2) Support-/User-Feedback: „falscher Kunde auf Beleg“ (Ziel: Rückgang). (3) Zeit bis Anlage eines neuen Projekts mit korrektem Kunde (optional: Usability-Test). |
| **Nicht-Ziele** | Vollständiges CRM; mehrere Auftraggeber pro Projekt mit komplexer Rechtslogik; automatische Dublettenbereinigung historischer Daten ohne Review. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | Migration: nullable `customer_id` auf `projects`, Backfill-Heuristik (Label-Match vs. manuelle Zuordnung)? Einheitliche `project_site` als eigene Tabelle vs. JSONB-Adresse am Projekt? |
| **API** | Breaking Change für Projekt-Liste/Detail? Versionierung `/v1` Contract in `@repo/api-contracts`. Validierung: Archiv-Kunde darf nicht neu verknüpft werden? |
| **UI** | Kunden-Suchdialog vs. Inline-Autocomplete; Baustellenadresse: gleiche Komponenten wie Kundenadressen? Mobile Tauglichkeit der Projekt-Anlage. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| `customerId` am Projekt (Pflicht oder stark empfohlen), Anzeige Kundenname aus Stammdaten, eine **Baustellenadresse** pro Projekt (Freitext-Felder oder Wiederverwendung Address-Shape). | Mehrere Objekt-/Nebenadressen, Ansprechpartner Baustelle, Import von Adressbuch, Dubletten-Warnung über ähnliche Schreibweisen. |

---

## E-02 — Projekt-360° (Auftrags-Hub)

**Status:** in Arbeit (seit 2026-04-06)  
**Lieferung (v1 + v2, 2026-04-06):** Projekt-Detail (`GET /v1/projects/:id`) + Hub-Seite `/web/projects/[projectId]` mit Belegen (Angebote/Rechnungen), Dateien (Upload/List), GAEB-Imports (List), Terminplanung (**nächste 7 Tage** via `GET /v1/scheduling/assignments?dateFrom&dateTo`, Deep-Link `/web/scheduling?project=…`), Zeiterfassung (Monat bis heute + letzte Buchungen, `/web/work-time`) und Forderungen/OP (Top offene Posten, `/web/sales/invoices/open?projectId=…`). **v2:** Rechnungslinks mit `#invoice-reminders` (Scroll zur Mahnungskarte), in der OP-Hub-Karte Kurzinfo Mahnungen + Druck/PDF der letzten Mahnung (Rechnungsdetail wird für die Top-OP nachgeladen). OP-Liste/Export optional nach `projectId` filterbar.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Nutzer springen zwischen Sales, Kalender und Ordnern; es fehlt eine **einzige Sicht** auf den Auftrag inkl. Pipeline und Artefakten. |
| **Messgrößen** | (1) Anteil Sessions mit Aufruf Projekt-Hub nach Erstellung. (2) Reduktion der Navigationsschritte bis zum „richtigen“ Beleg ( qualitative Interviews oder Click-Pfade). (3) Task-Erfolg: „Alle Belege zu Projekt X finden“ in unter X Minuten (Usability). |
| **Nicht-Ziele** | Vollständiges PM-Tool (Gantt, Ressourcenhistogramm); Kundenportal; Echtzeit-Kollaboration. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | Meist **read aggregations**: braucht es `project_id` auf weiteren Entitäten (GAEB, Assets) oder reicht Join über bestehende FKs? Performance: eine Hub-API vs. mehrere parallele Calls. |
| **API** | Aktuell: bestehende Endpunkte kombiniert (parallel). Optional spaeter: `GET /projects/:id/hub` fuer weniger Roundtrips, zentrale Berechtigungs-/Caching-Strategie und konsistente Teillisten. |
| **UI** | Layout: lange Seite mit Karten/Sections; **7-Tage-Termine** und **Mahnungs-Anker/Details in der OP-Karte** geliefert. Offen: eingebettete Mini-Pipeline, KPI-Kacheln, optional weniger parallele Requests (Hub-Endpunkt). |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| ~~Hub-Seite mit Belegen/Stammdaten/Dateien/GAEB~~ **geliefert**, inkl. **Terminplanung 7 Tage**, Zeiterfassung (Monat bis heute + letzte Buchungen), Forderungen/OP inkl. **#invoice-reminders** und Mahnungs-Kurzaktionen. | Eingebettete **Mini-Pipeline** (Status aus Quotes/Invoices), weitere KPI-Kacheln, Material-Widgets (nach E-11), ggf. `GET /projects/:id/hub`. |

---

## E-03 — Kundenstamm erweitern (Zahlung & Kommerz)

**Status:** in Arbeit (seit 2026-04-06)  
**Lieferung (erweitert, 2026-04-06):** Kunden-Felder `paymentTermsDays` + Skonto-Felder (Bps/Days) + **Mahnfristen-Defaults** (`reminderLevel1DaysAfterDue`/`reminderLevel2DaysAfterDue`/`reminderLevel3DaysAfterDue`) in DB/API/UI; Rechnung-Create uebernimmt `dueAt` serverseitig aus Kunden-Default, wenn nicht gesetzt (bei gesetztem `issuedAt` oder nicht-draft). Mahnungen nutzen die Defaults als Prefill.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Zahlungsziele und Mahnlogik müssen pro Rechnung neu eingegeben werden; kein kommerzieller Default pro Geschäftsbeziehung. |
| **Messgrößen** | (1) Anteil neuer Rechnungen, die Defaults vom Kunden übernehmen. (2) Zeit bis erste Mahnung (Prozess, nicht Rechtsberatung) — operativ messbar. (3) Optional: Reduktion manueller Korrekturen an `dueAt`. |
| **Nicht-Ziele** | Bonitätsrating externer Dienstleister; automatische Mahnung ohne Freigabe; vollständiges DSGVO-Audit-Tool. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | Neue Spalten auf `customers` (Zahlungsziel Tage, Skonto %, Skonto-Tage, Mahnfristen Stufe 1–3) vs. eigene Tabelle „commercial_terms“. Migration Defaults Mandant-weit? |
| **API** | PATCH Customer erweitern; Sales-Create: Server übernimmt Default-Berechnung `dueAt` aus Kunde wenn Feld leer? |
| **UI** | Kunden-Detail Formular-Sections; Hinweis in Rechnungseditor „von Kunde übernommen“. Mahnfristen-Defaults sichtbar/editierbar. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| `paymentTermsDays`, optional Skonto-Felder; **Mahnfristen-Defaults** (Stufe 1–3, Tage nach Fälligkeit); Übernahme in **neue** Rechnung wenn nicht überschrieben. | Kreditlimit-Flag, Kommunikationslog (Timeline), DSGVO-Export-Paket Button, kundenspezifische Mahntexte / Gebührenregeln. |

---

## E-04 — Terminplanung mit Projektbezug

**Status:** in Arbeit — erste Iteration umgesetzt (2026-04-06): `scheduling_assignments.project_id`, API/Web mit Projekt-Dropdown und Filtern; ICS und Rest siehe Roadmap.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Einsätze sind nicht mit Auftrag/Baustelle verknüpft — Planung, Nachweis und spätere Abrechnung sind schwer zu korrelieren. |
| **Messgrößen** | (1) Anteil `scheduling_assignments` mit `project_id`. (2) Nutzerbefragung: „Findet ihr den Einsatz zum richtigen Objekt?“ (5-Punkte). (3) Weniger nachträgliche Titel-/Orts-Korrekturen. |
| **Nicht-Ziele** | Routenoptimierung (Tour); automatische Fahrzeitberechnung; Ressourcenplanung mehrerer Gewerke. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | `project_id` nullable FK auf `projects`; Index für Kalender-Queries; bei Löschen Projekt: `set null` vs. Blocker? |
| **API** | PATCH/POST Assignment erweitern; Response inkl. Projekt-Titel + Kunde denormalisiert für UI-Performance. |
| **UI** | Projekt-Picker in Assignment-Dialog; „Ort“ aus Projekt-Baustelle vorbefüllen; Filter Kalender „nur Projekt Y“. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| Optionales `projectId`, Anzeige in Liste/Kalender, ICS-Beschreibung mit Projektname. | Konflikt-Warnung (Doppelbuchung), wiederkehrende Serien, Soll-Stunden pro Termin für E-05-Vergleich. |

---

## E-05 — Zeiterfassung

**Status:** in Arbeit — erste Iteration umgesetzt (2026-04-06): `work_time_entries`, API `/v1/work-time/entries`, Web `/web/work-time`. Rest: Soll/Ist vs. Planung, Feintuning Berechtigungen.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Keine strukturierte Ist-Zeit pro Projekt — Nachkalkulation und Auslastung bleiben Bauchgefühl. |
| **Messgrößen** | (1) Anzahl erfasster Stunden / Woche / Mandant. (2) Deckungsbeitrag-Report nutzbar (nach E-11). (3) Fehlerquote Korrekturen (Storno von Zeiteinträgen). |
| **Nicht-Ziele** | Lohnabrechnung; Tarifvertrags-Engine; GPS-Nachweis; Offline-first Mobile-App (siehe E-13). |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | Neue Tabelle `time_entries` (tenant, employee, date, minutes, project_id, optional quote_line_id, note); Unique-Regeln (Überlappung)? |
| **API** | CRUD + Liste gefiltert; Berechtigung: darf Teamleitung für andere buchen? Export CSV. |
| **UI** | Wochenansicht, Schnellerfassung, Mobile-Web Layout; Verknüpfung aus Projekt-Hub. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| Erfassung **Web**, Projektbezug **optional** (wie aktuelles Schema/API), ein Mitarbeiter pro Eintrag (Session-User oder mit Berechtigung andere). | Soll/Ist vs. Scheduling; Leistungsart; Integration Mobile; Genehmigungsworkflow. |

---

## E-06 — Forderungsmanagement (Mahnung, Zahlung, OP)

**Status:** in Arbeit — **v1 + v2 + v3 + v4 + v5-Basis umgesetzt** (2026-04-06): wie v3, zusaetzlich **`sales_reminder_templates`** (Stufe 1–10, Locale `de`/`en`, optional `fee_cents`); `GET`/`PUT /v1/sales/reminder-templates`, `GET …/resolved`; Reminder-PDF und Browser-Druck verwenden aufgeloesten Fließtext und Gebuehr inkl. Platzhalter (z. B. `{{invoiceNumber}}`, `{{openBalance}}`); Web **Einstellungen** (nur Mandanten-Admin) zum Pflegen. **E-Mail-Spike** (Dry-Run + optional SMTP-Send im Rechnungsdetail) und **CAMT-Matching-Spike** (`POST /v1/sales/invoices/camt-match`, Top-Kandidat, Buchung auf aktueller Rechnung). **CAMT-Dateiimport:** `POST /v1/sales/invoices/camt-import` (Multipart/XML), Vorschau mit Kandidaten auf `/web/sales/invoices/open`, **Persistenz/Idempotenz** über Datei-Hash (`sales_camt_import_batches` / `sales_camt_import_lines`), **Historie** (`GET …/camt-imports`, `GET …/camt-imports/:id`) — **ohne** automatische Buchung. **Sammelzahlungen:** `POST /v1/sales/invoices/payments/batch` + OP-UI (Mehrfachauswahl); **CAMT → Sammelzahlung** einzeln oder **mehrere Zeilen** (Checkboxen, „Alle Treffer“, Prefill; Duplikat-Rechnungen im CAMT werden pro Rechnung summiert). **Offen:** produktiver Mailflow (Queue/Retry/Audit).

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | `paidAt` reicht nicht für Teilzahlungen, Mahnhistorie und OP-Übersicht; Liquiditätssteuerung bleibt extern (Excel). |
| **Messgrößen** | (1) Anteil Rechnungen mit vollständig ausgeglichenem Saldo über System vs. manuell. (2) Anzahl Mahnläufe dokumentiert. (3) Durchschnittliche Tage bis Zahlung (DSO) — Trend über Quartale. |
| **Nicht-Ziele** | Inkasso-Integration; automatische rechtliche Mahntexte; Zinsberechnung nach BGB (nur optional Hinweis). |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | ~~Teilzahlungen~~ → **`sales_invoice_payments`**. ~~Mahn-Historie~~ → **`sales_invoice_reminders`**. ~~Mandanten-Mahntexte~~ → **`sales_reminder_templates`**. **CAMT-Import:** `sales_camt_import_batches` + `sales_camt_import_lines` (Hash-Idempotenz). |
| **API** | Zahlung + Loeschen erledigt. Mahnung + PDF/Druck erledigt. ~~Mahntext `GET`/`PUT` + Resolved~~ erledigt. **CAMT:** `POST …/camt-match`, `POST …/camt-import`, `GET …/camt-imports`, `GET …/camt-imports/:id`. **Sammelzahlung:** `POST …/payments/batch`. **Offen:** produktiver Mailversand-Workflow. ~~OP-Liste / CSV~~ erledigt. |
| **UI** | Rechnungsdetail, OP, Mahnungen erledigt. ~~Einstellungen: Mahntexte/Gebuehr (Admin)~~ erledigt. **E-Mail-Spike** und **CAMT-Zuordnung** im Rechnungsdetail; **CAMT-Import-Panel** auf der OP-Seite (Historie, Zeilenauswahl, Prefill Sammelzahlung). **Offen:** Dashboard-Kachel „Summe OP“ (optional). |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| ~~Teilzahlungen, Saldo-Anzeige~~ **(v1)**; ~~OP-Liste + CSV, Löschen Zahlungszeile~~ **(v2)**; ~~manuelle Mahnung + Historie + PDF/Druck~~ **(v3)**; ~~Mahntext-Templates + optionale Gebuehr, PDF/Druck, Admin-UI~~ **(v4)**; **E-Mail-/CAMT-Spike** **(v5-Basis)**; **CAMT-Dateiimport** (Vorschau + Persistenz/Historie) **(v5.1)**; **Sammelzahlung + CAMT-Mehrfach-Prefill** **(v5.2)**. | Produktiver E-Mail-Versand (Queue/Retry/Audit), automatische Eskalation nach Regeln. |

### Abgeschlossene Iteration — OP + CSV + Korrektur (v2)

| # | Ticket | Status |
|---|--------|--------|
| **T1–T2** | Saldo-Logik zentral + `GET /v1/sales/invoices/open-items` | umgesetzt |
| **T3** | CSV `…/open-items/export` | umgesetzt |
| **T4–T5** | BFF + Web `/web/sales/invoices/open` | umgesetzt |
| **T6** | E2E Playwright | optional / offen |
| — | **`DELETE …/payments/:paymentId`** + BFF + UI (Korrektur falscher Buchung) | umgesetzt |

### Abgeschlossene Iteration — Mahnung & Historie (v3)

| # | Ticket | Status |
|---|--------|--------|
| **M1** | **Schema `sales_invoice_reminders`** | umgesetzt |
| **M2** | **API** (`POST …/reminders`, Reminder-PDF `GET …/reminders/:reminderId/pdf`) | umgesetzt |
| **M3** | **UI** (Rechnungsdetail: Liste + Erfassen; Druck/PDF) | umgesetzt |
| **M4** | **E-03 Abgleich** (Kunden-Defaults + Prefill) | umgesetzt |

### Abgeschlossene Iteration — Mahntext-Templates & Gebühren (v4)

| # | Ticket | Status |
|---|--------|--------|
| **V4-1** | **`sales_reminder_templates` + `GET`/`PUT /v1/sales/reminder-templates`** | umgesetzt |
| **V4-2** | **Reminder-PDF + Druck** nutzen aufgelösten Text (`…/resolved`, serverseitig in PDF-Handler) | umgesetzt inkl. Platzhalter-Auflösung |
| **V4-3** | **Optionale `fee_cents`** je Stufe/Locale; Zeile im PDF/Druck | umgesetzt |
| **V4-4** | **Web Einstellungen** (`WebSalesReminderTemplatesCard`, BFF) | umgesetzt (Rollen: wie sonstige Mandanteneinstellungen) |
| **V4-5** | **API-Smoke** (`http-smoke-mock.mts`; Mahntexte + **CAMT-Import**) | umgesetzt |

**Noch offen (Backlog):** produktiver E-Mail-Workflow (Queue/Retry/Audit). ~~Sammelzahlungen~~ / ~~CAMT-Persistenz~~ / ~~CAMT-Mehrfach-Prefill~~ geliefert.

---

## E-07 — Belegtiefe (Steuern, Rabatte, Teilabrechnung, Storno)

**Status:** teilweise umgesetzt (Basis vorhanden, 2026-04-06): Angebots-/Rechnungsfluss mit Positionen und PDF/Druck steht; tiefe Steuer-/Rabatt-/Teilrechnungslogik bleibt offen.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Belege sind für deutsche Handwerks-Realität zu flach (Steuer, Abschläge, Teilrechnungen, Gutschriften). |
| **Messgrößen** | (1) Anteil Rechnungen mit korrekt ausgewiesener USt-Split (Review-Stichprobe). (2) Nutzung Teilrechnungsketten pro Projekt. (3) Weniger manuelle Korrektur-PDFs außerhalb des Systems. |
| **Nicht-Ziele** | Internationale Rechnung ohne DE-Fokus; vollständige Buchhaltung doppelt; Anlagenbuchhaltung. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | Steuersätze pro Position oder Kopf; `parent_invoice_id` / `billing_group_id` für Teilrechnungen; Gutschrift `credits` referenziert Original? |
| **API** | Neuberechnung Totals serverseitig; Rundungsregeln (0,01 €); Konflikt bei gleicher Belegnummer. |
| **UI** | Steuer-Zeilen in Editor; Wizard „Schlussrechnung“; Storno-Flow mit Grund. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| 7 % / 19 % (konfigurierbar), Rabatt Kopf/Position, einfache **Teilrechnungskette** am Projekt, Gutschrift-Belegtyp. | Lieferschein/Leistungsnachweis als eigener Typ, Angebots-Versionierung, §13b-Felder, komplexe Skonto-Kombinationen. |

---

## E-08 — GoBD & Revisionssicherheit

**Status:** teilweise umgesetzt (Vorstufe, 2026-04-06): Lifecycle-/Audit-Bausteine vorhanden, aber kein durchgängiger Finalisierungs-/Sperrprozess für Belege.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Änderungen an Belegen nach „Versand“ sind schwer auditierbar; Anforderungen an Unveränderbarkeit nicht explizit modelliert. |
| **Messgrößen** | (1) 100 % finaler Belege mit archiviertem Snapshot (Hash/Dateipfad). (2) Audit-Events bei Storno vs. Edit-Versuch. (3) Prüfung durch Steuerberater: „Export nachvollziehbar“ (qualitativ). |
| **Nicht-Ziele** | Zertifizierung durch Drittanbieter; Blockchain; langfristige Archivierung außerhalb des definierten Storage. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | `document_status` finalisiert; `content_hash` / `snapshot_path`; Tabelle `audit_log` (entity, action, diff JSON). |
| **API** | 409 bei PATCH auf final; Endpoint „Storno/Gutschrift“ statt DELETE. |
| **UI** | Sperre im Editor; Banner „Gebucht/Unveränderbar“; Download letzter Snapshot. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| Status final + PDF-Snapshot beim Setzen; Audit für Sales-Dokumente; kein DELETE finaler Belege. | Vollständiges Diff-Log aller Felder, Tamper-Evidence, Retention-Policies pro Mandant. |

---

## E-09 — Export: XRechnung / ZUGFeRD & DATEV

**Status:** teilweise umgesetzt (2026-04-06): DATEV-Settings + Buchungs-CSV sind vorhanden; XRechnung/ZUGFeRD noch offen.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Behörden und Kunden fordern **elektronische Rechnung**; Steuerberater brauchen **DATEV**-kompatiblen Export — manuelle Nacharbeit kostet Zeit. |
| **Messgrößen** | (1) Anteil Ausgangsrechnungen mit erfolgreich generiertem XRechnung-XML. (2) DATEV-Import ohne Fehler beim Steuerberater (Feedback-Loop). (3) Zeit für Monatsabschluss-Export (Subjektiv). |
| **Nicht-Ziele** | PEPPOL-Netzwerk als Betreiber; alle EU-Profile gleichzeitig; vollständiger Eingangsrechnungs-Workflow. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | Export-Metadaten gespeichert? (Zeitpunkt, Profil-Version); DATEV-Kontenmapping Tabelle `org_accounting_settings`. |
| **API** | `GET .../xrechnung`, `GET .../zugferrd` (embedded PDF); DATEV Buchungsstapel: bestehende Route erweitern — Validierung gegen XSD wo möglich. |
| **UI** | Download-Buttons; Konfiguration SKR03/SKR04; Fehlerliste letzter Export. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| XRechnung **CII** Minimum + ZUGFeRD Basic; DATEV **Ausgangs** Buchungsstapel mit dokumentiertem Mapping. | Mehrere Profile, Eingangsrechnungen DATEV, automatischer Versand XRechnung per E-Mail. |

---

## E-10 — Maler-Module produktiv integrieren

**Status:** teilweise umgesetzt (2026-04-06): GAEB/LV und digitale Projektmappe sind angebunden; End-to-End-Übernahme in Belegfluss und serverseitige Persistenz aller Module ist noch unvollständig.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Flächenberechnung und ähnliche Tools leben **neben** dem Auftrag (localStorage); GAEB und Mappe nicht durchgängig mit Angebot/Projekt verbunden. |
| **Messgrößen** | (1) Anteil gespeicherter Aufmaß-Modelle serverseitig mit `project_id`. (2) Anzahl GAEB-Imports mit Positionsübernahme in Angebot. (3) Nutzung Projektmappe (Uploads / Projekt). |
| **Nicht-Ziele** | Vollständiger BIM-Viewer; Eigene CAD-Software; Produktkatalog aller Lackhersteller weltweit. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | Neue Tabelle `area_calculation_models` oder JSONB am Projekt; Migration von localStorage? |
| **API** | CRUD Modell; GAEB: bestehende `lv_documents` + Export zu Quote-Lines — Transaktionsgrenzen. |
| **UI** | Flächenrechner lädt/speichert per Projekt; GAEB-Wizard End-to-End; Asset-Upload mit Progress. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| Server-Persistenz Aufmaß **pro Projekt**, Übernahme Summen/Positionen ins Angebot (manuell bestätigt); Mappe upload/list/delete. | Auto-Fill Positionen aus LV, Team-Farben in PDF-Text, Mobile-Fotos zur Mappe. |

---

## E-11 — Materialwirtschaft & Nachkalkulation (MVP)

**Status:** teilweise vorbereitet (2026-04-06): Katalog-/Import-Bausteine vorhanden; operativer Materialprozess (Bestellung, Wareneingang, Projektkosten-Loop) noch offen.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Materialkosten und Deckungsbeitrag sind nicht aus einem System ableitbar; Katalog-Bibliotheken sind nicht im operativen Fluss. |
| **Messgrößen** | (1) Anzahl Bestellungen/Eingänge erfasst im System. (2) Nachkalkulations-Report genutzt (Aufrufe). (3) Abweichung Angebot vs. Ist-Material (Stichprobe). |
| **Nicht-Ziele** | Voll-Lager mit Inventur; Produktion; EDI mit Großhändlern. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | `purchase_orders`, `goods_receipts` minimal; Verknüpfung `project_id`; Artikelreferenz zu Katalog-Import? |
| **API** | Artikelsuche über importierte DATANORM/BMEcat; POST Bestellung; Report Endpoint Nachkalkulation. |
| **UI** | Bestellflow; Projekt-Kosten-Tab; einfache Tabelle Ist vs. Angebot. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| Manuelle Bestellung mit Artikel aus Katalog-Import; Wareneingang; Kostenaggregation pro Projekt; grobe Nachkalkulation. | Lagerbestände, Reservierung, Lieferantenpreislisten automatisch. |

---

## E-12 — Subunternehmer & Eingangsrechnungen

**Status:** offen (2026-04-06) — als späteres/optionales Epic.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Fremdleistungen und Eingangsrechnungen laufen außerhalb — keine durchgängige Kosten- und Steuerabbildung im Projekt. |
| **Messgrößen** | (1) Anzahl erfasster Eingangsrechnungen im System. (2) Projektkosten vollständiger (Vergleich vorher/nachher). (3) DATEV-Eingang ohne Doppelbuch (manueller Abgleich). |
| **Nicht-Ziele** | Lieferantenportal; automatische OCR für alle PDFs; Vertragsmanagement. |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | `suppliers` light; `purchase_invoices` mit `project_id`, USt; Verknüpfung zu `employees`? (nein — eigene Rolle) |
| **API** | CRUD Eingangsrechnung; Export DATEV Eingang — Abstimmung mit E-09. |
| **UI** | Erfassungsmaske; Zuordnung Projekt; Liste offene Eingangsrechnungen. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| Eingangsrechnung erfassen, Steuer, Projekt, einfacher DATEV-Export. | Abnahmeprotokoll Sub, Vertragsdatum, OCR-Assist, Freigabe-Workflow. |

---

## E-13 — Plattform (Rollen, Audit, Performance, Offline)

**Status:** teilweise umgesetzt (2026-04-06): Rollenmatrix und einzelne Audit-Pfade vorhanden; zentrale Audit-Sicht, feinere Action-Permissions und verbindliche Offline-Story offen.

### Initiative Brief

| Feld | Inhalt |
|------|--------|
| **Problem** | Große LV-Imports und sensible Belege brauchen **Performance** und **Nachvollziehbarkeit**; klare **Offline-Strategie** fehlt für Baustellen-Alltag. |
| **Messgrößen** | (1) p95 Latenz GAEB-Import großer Datei. (2) Audit-Abdeckung kritischer Events (%). (3) Fehlerrate bei Sync (wenn Offline an). |
| **Nicht-Ziele** | Multi-Region-DR in MVP; vollständiges SIEM; eigene Mobile-App in diesem Epic (nur Strategie/Spike). |

### Technische Spike-Liste

| Bereich | Spike / Klärungsfrage |
|---------|------------------------|
| **Schema** | `syncMutationReceipts` Nutzung definieren; Audit-Tabelle zentral vs. pro Domäne. |
| **API** | Background-Job + Polling für Import; Rate-Limits; Permission-Matrix pro Action. |
| **UI** | Progress/Retry bei Import; Fehlermeldungen verständlich; ggf. „read-only“ bei fehlender Sync-Konfliktauflösung. |

### MVP vs. Phase 2

| MVP | Phase 2 |
|-----|---------|
| Async Import-Job + Status; Basis-Audit (wie E-08); Rollen: z. B. `sales:edit` vs `accounting:finalize`. | Umfangreiches Permission-Modell, Audit-UI, Offline-Sync für definierte Entitäten, Performance-Budgets in CI. |

---

## Parallele Arbeit: Schnittstellen zwischen Teams

| Schnittstelle | „Contract First“ Artefakt |
|---------------|---------------------------|
| Frontend ↔ Backend | `@repo/api-contracts` Zod-Schemas + Versionierung; BFF-Routen spiegeln API. |
| Epic-Übergänge | Feature-Flags oder nullable FKs, damit UI vor vollständiger Datenfüllung nicht bricht. |
| QA | Mindestens ein **E2E-Pfad** pro Epic-MVP (Playwright wo vorhanden). |

---

*Bei Änderung des Scope: Messgrößen und Nicht-Ziele explizit neu abstimmen.*
