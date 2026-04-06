# Roadmap: Epics — Maler & Lackierer (Auftragsbearbeitung & Rechnungswesen)

**Stand:** 2026-04-06  
**Grundlage:** [`.cursor/maler-lackierer-modul-funktionsluecken.md`](./maler-lackierer-modul-funktionsluecken.md)

## Änderungsstand (vollständig abgeglichen)

- E-06 auf **v5-Basis** aktualisiert: v4 (Templates/Gebühr) plus **E-Mail-Spike** und **CAMT-Zuordnungs-Spike** dokumentiert; **CAMT-Dateiimport-MVP** (Vorschau/Zuordnungsvorschläge, keine Auto-Buchung) ergänzt.
- E-07 bis E-13 mit klaren Reifegraden (`teilweise umgesetzt` / `teilweise vorbereitet` / `offen`) an den Code-Stand angepasst.
- Nächste Schritte auf echte Restlücken fokussiert: E-02 v3 (Hub-Aggregation/KPIs), E-06 Produktivierung (Mail/Sammelzahlung), E-07/E-08, E-09 (XRechnung/ZUGFeRD + DATEV-Vertiefung).

**Legende**

- **Epic:** großes Lieferpaket (mehrere Sprints / Releases).
- **Abhängigkeiten:** andere Epics, die idealerweise zuerst oder parallel mit Schnittstellenvertrag starten.
- **Phasen:** grobe zeitliche/logische Reihenfolge — keine Terminversprechen.

---

## Phasenüberblick

| Phase | Fokus | Epics |
|-------|--------|--------|
| **A — Fundament** | Stammdaten & Objekte verbinden | E-01, E-02, E-03 |
| **B — Operativ** | Planung & Zeit am Auftrag | E-04, E-05 |
| **C — Rechnungswesen** | Forderungen, Mahnung, Zahlung, Tiefe | E-06, E-07 |
| **D — Compliance & Export** | DE-Steuer, GoBD, XRechnung, DATEV | E-08, E-09 |
| **E — Branche & Wachstum** | Maler-Module integrieren, Material, Sub | E-10, E-11, E-12 |
| **F — Plattform** | Rechte, Audit, Performance, Offline | E-13 |

## Master-Statusmatrix (E-01 bis E-13)

| Epic | Reifegrad | Kurzstatus |
|------|-----------|------------|
| **E-01** | **umgesetzt** | Projekt mit Kunden-/Baustellenbezug produktiv |
| **E-02** | **in Arbeit** | Hub v1/v2 produktiv, v3 (KPI/Aggregation) offen |
| **E-03** | **in Arbeit** | Zahlungs-/Mahn-Defaults in Basis umgesetzt |
| **E-04** | **in Arbeit** | Projektbezug + Zeitraum-Filter geliefert, Planungslogik offen |
| **E-05** | **in Arbeit** | Zeiterfassung-Basis geliefert, Soll/Ist offen |
| **E-06** | **in Arbeit** | v1–v5 Basis + **CAMT-Dateiimport-MVP** (Vorschau); Sammelzahlungen/produktiver Mailflow offen |
| **E-07** | **teilweise umgesetzt** | Belegbasis da, Tiefe (Steuer/Rabatt/Teilrechnung) offen |
| **E-08** | **teilweise umgesetzt** | Audit-Vorstufe da, Finalisierung/Snapshot offen |
| **E-09** | **teilweise umgesetzt** | DATEV-Basis da, XRechnung/ZUGFeRD offen |
| **E-10** | **teilweise umgesetzt** | GAEB/Assets da, End-to-End-Integration offen |
| **E-11** | **teilweise vorbereitet** | Katalog-Backbone da, operativer Materialfluss offen |
| **E-12** | **offen** | optional/später |
| **E-13** | **teilweise umgesetzt** | Rollen-/Audit-Bausteine da, zentrale Plattformreife offen |

---

## Epic E-01 — Projekt ↔ Kunde ↔ Baustelle (Stammdaten-Fundament)

**Ziel:** Projekte sind nicht mehr nur Freitext-Kunde, sondern verbindlich mit dem Kundenstamm verknüpft; Baustelle/Objekt ist adressierbar und wiederverwendbar für Belege und Einsätze.

**Status:** umgesetzt (2026-04-06)

**Lieferumfang (Indikativ)**

- Datenmodell: `customerId` am Projekt (Migration, Backfill-Strategie für bestehende `customerLabel`).
- Optional: `project_site_addresses` oder erweiterte Projektadresse (Lieferung ≠ Rechnung).
- UI: Auswahl Kunde aus Stammdaten, Übernahme Standard-Rechnungsadresse, Bearbeitung Baustellenadresse.
- API + `@repo/api-contracts`: erweiterte Projekt-Payloads, Validierung.

**Abhängigkeiten:** kein anderer Epic zwingend; **blockiert** E-02 (360°-Hub), E-04 (Scheduling-Bezug).

**Bezug Analyse:** Abschnitte 2.1, 4, 5 (Rollen/Adressen teilweise).

---

## Epic E-02 — Projekt-360° (Auftrags-Hub)

**Ziel:** Eine Projekt-Detailansicht bündelt Belege, Termine, Dokumente und später Zeiten/Material — Sicht auf die Pipeline „Angebot → Ausführung → Abrechnung“.

**Status:** in Arbeit (seit 2026-04-06) — **v1 + v2 geliefert:** Projekt-Hub mit Belegen/Dateien/GAEB, Terminplanung (**nächste 7 Tage**, über `GET /v1/scheduling/assignments?dateFrom&dateTo`), Zeiterfassung (Monat bis heute inkl. letzte Buchungen), Forderungen/OP (Top offene Posten, projektgefilterte OP-Liste) sowie **Mahnungs-Kontext**: Links `…/invoices/:id#invoice-reminders`, Zusammenfassung Mahnungen + Druck/PDF der letzten Mahnung in der Hub-Karte.

**Lieferumfang (Indikativ)**

- UI: Sections für Belege (Angebote/Rechnungen), Einsätze, Dateien (`project_assets`) und Verknüpfungen GAEB/LV.
- Hub-Karte „Terminplanung“: Einsätze **heute + 6 Tage** je Projekt; Deep-Link `/web/scheduling?project=…`.
- Hub-Karte „Zeiterfassung“: Monat-bis-heute je Projekt, Summe + letzte Buchungen, Link nach `/web/work-time`.
- Hub-Karte „Forderungen/OP“: Top offene Posten (Saldo > 0) je Projekt, Link nach `/web/sales/invoices/open?projectId=…`, Mahnung(en)/Stufe + Druck/PDF (letzte Mahnung).
- OP-Liste + CSV-Export: optionaler `projectId`-Filter für konsistenten Projektkontext.
- Dashboard-Erweiterungen: weitere projektbezogene KPIs (nach E-07/E-11 teilweise erst sinnvoll).
- Navigation: Deep-Links von Übersicht und Sales in den Hub.

**Abhängigkeiten:** **E-01** (Kunden-/Objekt-Kontext), **E-04** (Termine), **E-05** (Zeiterfassung), optional **E-06** (Forderungen/OP und Mahnungsbezug im Hub).

**Bezug Analyse:** Abschnitte 2.2, 3, 4.

---

## Epic E-03 — Kundenstamm erweitern (Zahlung & Kommerz)

**Ziel:** Rechnungsstellung und Mahnung können Standard-Zahlungsbedingungen und Kunden-Defaults nutzen; optional CRM-Light und Risiko.

**Status:** in Arbeit (seit 2026-04-06) — v1 erweitert umgesetzt: Zahlungsziel/Skonto + Mahnfristen-Defaults (Stufe 1–3 Tage nach Fälligkeit) in DB/API/UI; `dueAt` kann serverseitig aus Kunden-Defaults abgeleitet werden; E-06 nutzt Prefill.

**Lieferumfang (Indikativ)**

- Felder: Zahlungsziel-Tage, Skonto, Mahnfristen (Defaults für neue Rechnungen/Mahnungen; Stufe 1–3).
- Optional: Kreditlimit, Kennzeichnung „Vorkasse“, Kommunikationsnotizen mit Zeitstempel.
- DSGVO: Einwilligungen / Löschworkflow (Minimal viable: Export + dokumentierter Löschantrag).

**Abhängigkeiten:** schwach mit **E-06** (Mahnwesen nutzt Defaults).

**Bezug Analyse:** Abschnitt 5.

---

## Epic E-04 — Terminplanung mit Projekt- und Kundenbezug

**Ziel:** Jeder Einsatz kann optional/mandatory einem Projekt (und damit indirekt Kunde/Baustelle) zugeordnet werden; Ort kann aus Adresse vorbefüllt werden.

**Status:** in Arbeit (seit 2026-04-06) — erste Iteration geliefert: DB `project_id`, API-Listenfilter `projectId` und **`dateFrom`/`dateTo`** (Zeitraum, max. 31 Tage) für Einsatz-Listen, Create/Patch/ICS, Web-Terminplanung mit Projekt-Dropdown, Projekt-Hub-Karte (**7 Tage**) + Deep-Link `/web/scheduling?project=…`.

**Lieferumfang (Indikativ)**

- Schema: `projectId` (optional), ggf. `customerId` denormalisiert oder über Projekt auflösbar.
- UI: Picker für Projekt, Anzeige Kunde/Baustelle in Kalender und Liste.
- ICS: Metadaten wo sinnvoll.
- Später: Ressourcenkonflikte, wiederkehrende Serien (kann eigene Stories sein).

**Abhängigkeiten:** **E-01** stark empfohlen.

**Bezug Analyse:** Abschnitte 2.3, 8.

---

## Epic E-05 — Zeiterfassung (Web, API, Projektbezug)

**Ziel:** Mitarbeitende erfassen Zeiten mit Zuordnung zu Projekt (und optional Position); Grundlage für Auslastung und Nachkalkulation.

**Status:** in Arbeit (seit 2026-04-06) — erste Iteration: Tabelle `work_time_entries` (Datum + Dauer in Minuten, optional `project_id`, Notiz), API CRUD unter `/v1/work-time/entries`, Web `/web/work-time` (Erfassung, Liste, Bearbeiten, Löschen). **Offen:** Soll/Ist-Vergleich zu Planung (E-04), tiefere Auswertungen und Projekt-Deep-Linking aus allen Kontexten.

**Lieferumfang (Indikativ)**

- Neues Domänenmodell: Zeiteinträge (Tenant, Mitarbeiter, Datum, Dauer oder Von–Bis, Projekt, optional `sales_quote_line` / freie Leistung).
- API + BFF + UI (Listen, Erfassung, Korrektur mit Berechtigung).
- Übersicht: Soll aus Planung vs. Ist (teilweise nach E-04).

**Abhängigkeiten:** **E-01**; **E-04** für Soll-Vergleich wünschenswert.

**Bezug Analyse:** Abschnitte 3, 7, 8, 9.

---

## Epic E-06 — Forderungsmanagement: Mahnung, Zahlung, offene Posten

**Ziel:** Über „paidAt“ hinaus: Teilzahlungen, Mahnlauf, OP-Liste, Zahlungszuordnung.

**Status:** in Arbeit — **v1 + v2 + v3 + v4 + v5-Basis umgesetzt** (2026-04-06): wie zuvor, plus `sales_reminder_templates` (Stufe 1–10, `de`/`en`, optional Gebühr); API `GET`/`PUT /v1/sales/reminder-templates`, `GET …/resolved`; Reminder-PDF und Web-Druck nutzen aufgelösten Text/Gebühr inkl. Platzhalter (z. B. Belegnr./Betrag/Fälligkeit); Mandanten-Admins bearbeiten unter **Einstellungen**. **E-Mail-Spike** (Dry-Run + optional SMTP-Send aus Rechnungs-Mahnung) und **CAMT-Zuordnungs-Spike** (`POST /v1/sales/invoices/camt-match` + UI „Match und Zahlung buchen“). Neu: **CAMT-Dateiimport-MVP** — `POST /v1/sales/invoices/camt-import` (Multipart/XML), Vorschau mit Zuordnungskandidaten auf der OP-Seite; **keine** automatische Zahlungsbuchung aus dem Import. **Offen:** Sammelzahlungen/Mehrfachzuordnung, robuster Produktiv-Mailflow, ggf. persistierter/idempotenter Bankimport.

**Lieferumfang (Indikativ)**

- ~~Teilzahlungen / Salden; OP-Liste; CSV; Löschen Zahlungszeile.~~ → **v1/v2 erledigt.** **CAMT-Matching-Spike** (Score/Confidence, Top-Kandidat + Buchung im Rechnungsdetail) und **CAMT-Dateiimport-MVP** (XML-Upload, Vorschau/Kandidaten, ohne Auto-Buchung) sind geliefert; offen: Mehrfachzuordnung/Sammelzahlung, optional PATCH statt Löschen+Neu.
- ~~Mahnwesen MVP (Historie + PDF/Druck + Prefill)~~ → **v3 erledigt.** ~~Mahntext-Templates/Gebühren (pro Mandant, mehrsprachig)~~ → **v4 erledigt.** **E-Mail-Spike** (Preview + optional SMTP-Send) ist geliefert; offen: produktiver Versandprozess mit Queue/Retry/Tracking.
- Verknüpfung mit Kunden-Defaults (**E-03**).

**Abhängigkeiten:** Basis-Sales vorhanden; **E-03** für komfortable Mahn-Defaults.

**Bezug Analyse:** Abschnitte 3, 5, 6 (Punkte 7–8).

**Als Nächstes (v6+):** Sammelzahlungen/Mehrfachzuordnung; Mail-Produktivierung (Queue/Retry/Audit); optional CAMT-Import vertiefen (Persistenz, Idempotenz).

---

## Epic E-07 — Belegtiefe: Steuern, Rabatte, Teilabrechnung, Storno

**Ziel:** Handwerks- und DE-taugliche Belege: Steuersätze, Rabatte/Skonto, Abschlags- und Schlussrechnungen, Gutschriften, Leistungsnachweise/Lieferscheine soweit Scope.

**Status:** teilweise umgesetzt (Basis, 2026-04-06) — Kern-Belegfluss mit Angeboten/Rechnungen, Positionen, PDF/Druck und Storno-Flow ist vorhanden; **offen** sind v. a. Steuer-Engine, Rabatte/Skonto auf Beleg-/Positionsniveau, Teilrechnungsketten und Gutschrift-Logik.

**Lieferumfang (Indikativ)**

- Steuer-Engine (mindestens Mehrwertsteuer-Split, Konfiguration pro Organisation).
- Rabatte auf Kopf/Position; Abschlagsreihen mit Verweis auf Auftrag/Projekt.
- Neuer oder erweiterter Belegtyp „Leistungsnachweis/Lieferschein“ (optional ausgelagert in E-11).
- Storno/Gutschrift mit nachvollziehbarer Kette (nicht nur löschen).

**Abhängigkeiten:** **E-01** für konsistente Adress-/Steuerdaten; **E-08** für GoBD-Schnittmenge abstimmen.

**Bezug Analyse:** Abschnitt 6 (Punkte 1–6, 12–13).

---

## Epic E-08 — GoBD & Revisionssicherheit (Belege)

**Ziel:** Finalisierte Belege sind unveränderbar archiviert; Änderungen nur über Revision/Storno mit Audit.

**Status:** teilweise umgesetzt (Vorstufe, 2026-04-06) — Lifecycle-Events/Audit-Bausteine sind vorhanden; **offen** sind Finalisierungs-/Sperrlogik, unveränderliche Snapshot-Strategie und durchgängige GoBD-Flows.

**Lieferumfang (Indikativ)**

- Status „final“ / Sperre; unveränderlicher PDF-/XML-Snapshot wo gefordert.
- Audit-Events (wer, wann, was) für Belege und kritische Stammdaten (**E-13** Schnittmenge).

**Abhängigkeiten:** mit **E-07** koordinieren (welche Felder wann frozen).

**Bezug Analyse:** Abschnitte 6.10, 11.2.

---

## Epic E-09 — Export: XRechnung / ZUGFeRD & DATEV-Buchungsstapel

**Ziel:** Ausgangsrechnungen elektronisch übergeben; DATEV-Export fachlich vollständig (Kontenrahmen, Steuerschlüssel, Perioden).

**Status:** teilweise umgesetzt (2026-04-06) — DATEV-Settings + Buchungs-CSV sind produktiv angebunden; **XRechnung/ZUGFeRD** sind noch offen.

**Lieferumfang (Indikativ)**

- XRechnung/ZUGFeRD-Generierung aus Rechnungsdomäne (Minimum Viable Profile).
- DATEV: Mapping UI oder Config, Validierung, Fehlerreport (bestehende BFF-Routen ausbauen).
- Abstimmung mit **E-07** (Steuerfelder).

**Abhängigkeiten:** **E-07**, **E-08** für stabile Export-Snapshots.

**Bezug Analyse:** Abschnitte 6.9–6.11, 10 (DATEV-Zeile).

---

## Epic E-10 — Maler-Module produktiv integrieren

**Ziel:** Flächenberechnung, Farben, GAEB, digitale Mappe usw. sind mandanten- und projektbezogen serverseitig nutzbar; Übernahme in Angebote wo sinnvoll.

**Status:** teilweise umgesetzt (2026-04-06) — GAEB/LV und Projekt-Assets sind serverseitig angebunden; mehrere Maler-Module sind UI-seitig vorhanden. **Offen:** durchgängige End-to-End-Verknüpfung (z. B. Aufmaß/Material direkt in Angebots-/Rechnungsfluss).

**Lieferumfang (Indikativ)**

- Flächenberechnung: Persistenz Server, Verknüpfung Projekt/Angebot, Wegfall reiner `localStorage`-Pflicht.
- GAEB/LV: durchgängiger Workflow bis Positionsübernahme (bestehende `lv_documents` / Parser im Blick).
- `project_assets`: UI + API vollständig für Produktivbetrieb.
- Farbmanagement: Nutzung in Belegtexten / Team-Palette in Angeboten.

**Abhängigkeiten:** **E-01**, **E-02**; **E-07** für Positionsübernahme.

**Bezug Analyse:** Abschnitte 2.4, 10.

---

## Epic E-11 — Materialwirtschaft & Nachkalkulation (MVP)

**Ziel:** Materialbedarf aus LV/Aufmaß, Bestellung, Zuordnung zum Projekt; grobe Nachkalkulation Angebot vs. Ist (Material + Zeit).

**Status:** teilweise vorbereitet (2026-04-06) — Katalog-/Import-Bausteine (u. a. DATANORM/BMEcat-Pipeline) sind vorhanden; **offen** ist der operative Bestell-/Wareneingangs- und Nachkalkulationsfluss.

**Lieferumfang (Indikativ)**

- Integration DATANORM/BMEcat-Kataloge in Bestell-/Positionsauswahl (Bibliotheken existieren im Monorepo).
- Wareneingang minimal; Zuordnung zu Projekt.
- Nachkalkulations-Report (Deckungsbeitrag grob).

**Abhängigkeiten:** **E-01**, **E-05**; **E-10** für bessere Mengenbasis.

**Bezug Analyse:** Abschnitte 3, 9, 10 (Großhandel-Zeile).

---

## Epic E-12 — Subunternehmer & Eingangsrechnungen (optional / später)

**Ziel:** Fremdleistungen planen, abnehmen und mit Eingangsrechnungen abbilden.

**Status:** offen (2026-04-06) — als späteres/optionales Epic.

**Lieferumfang (Indikativ)**

- Lieferanten/Sub-Stammdaten light, Auftrag an Sub, Abnahmeprotokoll.
- Eingangsrechnung erfassen, optional DATEV-Eingang.

**Abhängigkeiten:** **E-01**, **E-07** (Steuer/Beleglogik), **E-09** (DATEV).

**Bezug Analyse:** Abschnitt 9 (letzter Punkt).

---

## Epic E-13 — Plattform: Rollen fein, Audit quer, Performance, Offline-Strategie

**Ziel:** Skalierbare Berechtigungen, nachvollziehbare Änderungen, große LV performant, klare Offline-/Sync-Story für Baustelle.

**Status:** teilweise umgesetzt (2026-04-06) — Rollenmatrix und verteilte Audit-Bausteine sind vorhanden; **offen** sind zentrale Audit-Sicht, feingranulare Actions quer durch alle Domänen, sowie eine verbindliche Offline-/Sync-Produktstrategie.

**Lieferumfang (Indikativ)**

- Feingranulare Permissions pro Aktion (Buchhaltung vs. Ausführung).
- Zentraler Audit-Service für kritische Entitäten.
- Hintergrundverarbeitung / Jobs für große Imports.
- Produktentscheid + technische Spike: Sync (`syncMutationReceipts`) vs. reine Online-Web-App.

**Abhängigkeiten:** querschnittlich; mit **E-08** abstimmen.

**Bezug Analyse:** Abschnitt 11.

---

## Abhängigkeitsgraph (vereinfacht)

```
E-01 ──┬──► E-02
       ├──► E-04 ──┐
       └──► E-05   ├──► E-02 (iterativ)
                   └──► E-05 (Soll/Ist)

E-03 ──► E-06 ──► E-02 (Forderungen/OP)
E-01,E-07 ──► E-08 ──► E-09
E-01,E-02,E-07 ──► E-10 ──► E-11
E-07,E-09 ──► E-12 (optional)
E-13 ◄── quer zu E-06, E-07, E-08
```

---

## Initiative Briefs (Detail)

Pro Epic: Problem, Messgröße, Nicht-Ziele, Spikes (Schema / API / UI), MVP vs. Phase 2 — siehe **[`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md)**.

---

---

## Nächste Schritte (Stand 2026-04-06)

| Priorität | Thema | Wo |
|-----------|--------|-----|
| **E-02** | **v2 geliefert** (7-Tage-Termine, `#invoice-reminders`, Mahnungs-Zusammenfassung im Hub); nächster Schnitt: Mini-Pipeline/KPI-Kacheln oder optionales `GET /projects/:id/hub` (weniger Roundtrips) | Projekt-360° |
| **E-06** | **v5 + CAMT-Dateiimport-MVP** geliefert; nächster Schnitt: Sammelzahlungen, produktiver Mailflow | Rechnungswesen |
| **E-07** | Belegtiefe ausbauen (Steuer, Rabatte/Skonto, Teilrechnungsketten, Gutschrift), auf bestehender Sales-Basis | Belege |
| **E-08** | GoBD-Sperren/Finalisieren + Snapshot-Konzept auf vorhandene Audit-Bausteine setzen | Compliance |
| **E-09** | DATEV fachlich vertiefen und XRechnung/ZUGFeRD starten | Export |
| **Optional** | Playwright E2E: OP-Seite + Mahnung-PDF; API-Tests (Reminders/Payments) | QA |

### Empfohlene Implementierungsreihenfolge (kurz)

1. **E-06 Produktivierung:** Sammelzahlungen/Mehrfachzuordnung sowie Mail-Queue/Retry/Audit priorisieren; CAMT-Import bei Bedarf vertiefen (Persistenz/Idempotenz).
2. **E-02 v3 (optional):** Hub-Aggregation (`GET /projects/:id/hub`) oder KPI/Mini-Pipeline; weniger parallele Client-Requests.
3. **E-07/E-08:** Belegtiefe und GoBD-Sperren koordiniert nachziehen (nicht parallel zu großen Sales-Refactors).
4. **E-09:** DATEV-Ausbau + XRechnung/ZUGFeRD als eigener Export-Track.

---

*Diese Datei ergänzt die Funktionslücken-Analyse um planbare Epics; Priorität und Schnitt können sich nach Marktfeedback verschieben.*
