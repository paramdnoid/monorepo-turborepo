# Roadmap: Epics — Maler & Lackierer (Auftragsbearbeitung & Rechnungswesen)

**Stand:** 2026-04-06  
**Grundlage:** [`.cursor/maler-lackierer-modul-funktionsluecken.md`](./maler-lackierer-modul-funktionsluecken.md)

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

---

## Epic E-01 — Projekt ↔ Kunde ↔ Baustelle (Stammdaten-Fundament)

**Ziel:** Projekte sind nicht mehr nur Freitext-Kunde, sondern verbindlich mit dem Kundenstamm verknüpft; Baustelle/Objekt ist adressierbar und wiederverwendbar für Belege und Einsätze.

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

**Lieferumfang (Indikativ)**

- UI: Register oder Sections: Belege (Angebote/Rechnungen), Einsätze, Dateien (`project_assets`), Verknüpfungen GAEB/LV wo vorhanden.
- Dashboard-Erweiterungen: projektbezogene KPIs (nach E-07/E-11 teilweise erst sinnvoll).
- Navigation: Deep-Links von Übersicht und Sales in den Hub.

**Abhängigkeiten:** **E-01** (sinnvolle Kunden-/Objekt-Kontexte); **E-04** für Termine im Hub.

**Bezug Analyse:** Abschnitte 2.2, 3, 4.

---

## Epic E-03 — Kundenstamm erweitern (Zahlung & Kommerz)

**Ziel:** Rechnungsstellung und Mahnung können Standard-Zahlungsbedingungen und Kunden-Defaults nutzen; optional CRM-Light und Risiko.

**Lieferumfang (Indikativ)**

- Felder: Zahlungsziel-Tage, Skonto, Standard-Mahnstufe, Mahnfristen (Defaults für neue Rechnungen).
- Optional: Kreditlimit, Kennzeichnung „Vorkasse“, Kommunikationsnotizen mit Zeitstempel.
- DSGVO: Einwilligungen / Löschworkflow (Minimal viable: Export + dokumentierter Löschantrag).

**Abhängigkeiten:** schwach mit **E-06** (Mahnwesen nutzt Defaults).

**Bezug Analyse:** Abschnitt 5.

---

## Epic E-04 — Terminplanung mit Projekt- und Kundenbezug

**Ziel:** Jeder Einsatz kann optional/mandatory einem Projekt (und damit indirekt Kunde/Baustelle) zugeordnet werden; Ort kann aus Adresse vorbefüllt werden.

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

**Lieferumfang (Indikativ)**

- Neues Domänenmodell: Zeiteinträge (Tenant, Mitarbeiter, Datum, Dauer oder Von–Bis, Projekt, optional `sales_quote_line` / freie Leistung).
- API + BFF + UI (Listen, Erfassung, Korrektur mit Berechtigung).
- Übersicht: Soll aus Planung vs. Ist (teilweise nach E-04).

**Abhängigkeiten:** **E-01**; **E-04** für Soll-Vergleich wünschenswert.

**Bezug Analyse:** Abschnitte 3, 7, 8, 9.

---

## Epic E-06 — Forderungsmanagement: Mahnung, Zahlung, offene Posten

**Ziel:** Über „paidAt“ hinaus: Teilzahlungen, Mahnlauf, OP-Liste, Zahlungszuordnung.

**Lieferumfang (Indikativ)**

- Teilzahlungen / Salden pro Rechnung (Datenmodell-Erweiterung).
- Mahnstufen, PDF/Textvorlagen, Historie, optional E-Mail-Versand (technischer Versand, keine Rechtsberatung).
- Offene-Posten-Report, Export CSV.
- Verknüpfung mit Kunden-Defaults (**E-03**).

**Abhängigkeiten:** Basis-Sales vorhanden; **E-03** für komfortable Defaults.

**Bezug Analyse:** Abschnitte 3, 5, 6 (Punkte 7–8).

---

## Epic E-07 — Belegtiefe: Steuern, Rabatte, Teilabrechnung, Storno

**Ziel:** Handwerks- und DE-taugliche Belege: Steuersätze, Rabatte/Skonto, Abschlags- und Schlussrechnungen, Gutschriften, Leistungsnachweise/Lieferscheine soweit Scope.

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

**Lieferumfang (Indikativ)**

- Status „final“ / Sperre; unveränderlicher PDF-/XML-Snapshot wo gefordert.
- Audit-Events (wer, wann, was) für Belege und kritische Stammdaten (**E-13** Schnittmenge).

**Abhängigkeiten:** mit **E-07** koordinieren (welche Felder wann frozen).

**Bezug Analyse:** Abschnitte 6.10, 11.2.

---

## Epic E-09 — Export: XRechnung / ZUGFeRD & DATEV-Buchungsstapel

**Ziel:** Ausgangsrechnungen elektronisch übergeben; DATEV-Export fachlich vollständig (Kontenrahmen, Steuerschlüssel, Perioden).

**Lieferumfang (Indikativ)**

- XRechnung/ZUGFeRD-Generierung aus Rechnungsdomäne (Minimum Viable Profile).
- DATEV: Mapping UI oder Config, Validierung, Fehlerreport (bestehende BFF-Routen ausbauen).
- Abstimmung mit **E-07** (Steuerfelder).

**Abhängigkeiten:** **E-07**, **E-08** für stabile Export-Snapshots.

**Bezug Analyse:** Abschnitte 6.9–6.11, 10 (DATEV-Zeile).

---

## Epic E-10 — Maler-Module produktiv integrieren

**Ziel:** Flächenberechnung, Farben, GAEB, digitale Mappe usw. sind mandanten- und projektbezogen serverseitig nutzbar; Übernahme in Angebote wo sinnvoll.

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

**Lieferumfang (Indikativ)**

- Integration DATANORM/BMEcat-Kataloge in Bestell-/Positionsauswahl (Bibliotheken existieren im Monorepo).
- Wareneingang minimal; Zuordnung zu Projekt.
- Nachkalkulations-Report (Deckungsbeitrag grob).

**Abhängigkeiten:** **E-01**, **E-05**; **E-10** für bessere Mengenbasis.

**Bezug Analyse:** Abschnitte 3, 9, 10 (Großhandel-Zeile).

---

## Epic E-12 — Subunternehmer & Eingangsrechnungen (optional / später)

**Ziel:** Fremdleistungen planen, abnehmen und mit Eingangsrechnungen abbilden.

**Lieferumfang (Indikativ)**

- Lieferanten/Sub-Stammdaten light, Auftrag an Sub, Abnahmeprotokoll.
- Eingangsrechnung erfassen, optional DATEV-Eingang.

**Abhängigkeiten:** **E-01**, **E-07** (Steuer/Beleglogik), **E-09** (DATEV).

**Bezug Analyse:** Abschnitt 9 (letzter Punkt).

---

## Epic E-13 — Plattform: Rollen fein, Audit quer, Performance, Offline-Strategie

**Ziel:** Skalierbare Berechtigungen, nachvollziehbare Änderungen, große LV performant, klare Offline-/Sync-Story für Baustelle.

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

E-03 ──► E-06
E-01,E-07 ──► E-08 ──► E-09
E-01,E-02,E-07 ──► E-10 ──► E-11
E-07,E-09 ──► E-12 (optional)
E-13 ◄── quer zu E-06, E-07, E-08
```

---

## Initiative Briefs (Detail)

Pro Epic: Problem, Messgröße, Nicht-Ziele, Spikes (Schema / API / UI), MVP vs. Phase 2 — siehe **[`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md)**.

---

*Diese Datei ergänzt die Funktionslücken-Analyse um planbare Epics; Priorität und Schnitt können sich nach Marktfeedback verschieben.*
