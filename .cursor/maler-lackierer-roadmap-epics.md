# Roadmap: Epics — Maler & Lackierer (Auftragsbearbeitung & Rechnungswesen)

**Stand:** 2026-04-07  
**Grundlage:** [`.cursor/maler-lackierer-modul-funktionsluecken.md`](./maler-lackierer-modul-funktionsluecken.md)

**Status-Quelle (Reifegrade):** [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md) → **„Status-Baseline (E-01 bis E-13)“**.

**Prioritätsentscheid (historisch, umgesetzt):** E-06 **Mail-Outbox/Stabilisierung** vor E-02 Hub-v3 (Details/Nachweis siehe Verifikation).

## Änderungsstand (vollständig abgeglichen)

- Reifegrade E-01–E-13 an die Verifikation-Baseline angepasst.
- E-02: Hub v3 (KPI/Pipeline + 30-Tage-Segmente/Trends + KPI-UI-Polish) dokumentiert als geliefert.
- E-06: Mail-Outbox + CAMT/Batch/OP dokumentiert als geliefert; nächster Fokus Betriebshärtung (Monitoring/Alerting).
- E-09: DATEV-Basis + XRechnung/ZUGFeRD-Endpunkte dokumentiert; Standardkonformität/Tiefe bleibt Backlog.

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
| **E-01** | **umgesetzt** | Kunden-/Baustellenbezug am Projekt geliefert |
| **E-02** | **in Arbeit** | Hub v1–v3 inkl. KPI/Pipeline + Segmente/Trends + UI-Polish geliefert; Ausbau offen |
| **E-03** | **in Arbeit** | Zahlungs-/Mahn-Defaults am Kunden geliefert; Vertiefung offen |
| **E-04** | **in Arbeit** | Scheduling: Projektbezug + Zeitraumfilter geliefert; Konflikte/Serien offen |
| **E-05** | **in Arbeit** | Zeiterfassung-Basis geliefert; Soll/Ist + Auswertung offen |
| **E-06** | **in Arbeit** | OP/Mahnung/CAMT/Batch + Mail-Outbox geliefert; Monitoring/Automation offen |
| **E-07** | **teilweise umgesetzt** | Belegbasis da; Steuer/Rabatt/Teilrechnungsketten offen |
| **E-08** | **teilweise umgesetzt** | Audit-Vorstufe da; Finalisieren/Snapshot/Sperren offen |
| **E-09** | **teilweise umgesetzt** | DATEV-Basis da; XRechnung/ZUGFeRD-Endpunkte vorhanden; Standardtiefe offen |
| **E-10** | **teilweise umgesetzt** | GAEB/Assets/Module teils da; End-to-End-Integration offen |
| **E-11** | **teilweise vorbereitet** | Katalog-Backbone da; operativer Materialfluss offen |
| **E-12** | **offen** | optional/später |
| **E-13** | **teilweise umgesetzt** | Rollen-/Audit-Bausteine da, zentrale Plattformreife offen |

---

## Epic E-01 — Projekt ↔ Kunde ↔ Baustelle (Stammdaten-Fundament)

- **Ziel**: Projekte sind nicht mehr nur „Freitext-Kunde“, sondern verbindlich mit dem Kundenstamm verknüpft; die Baustelle ist adressierbar und wiederverwendbar für Belege und Einsätze.
- **Reifegrad**: umgesetzt (Stand 2026-04-07)
- **Geliefert (Kurz)**: Kundenbezug am Projekt + Baustellenadresse pro Projekt; UI/API unterstützen Anlage und Bearbeitung.
- **Nächster Fokus**: Backfill/Nachpflege für Legacy-Projekte (operativ); optionale Baustellen-Metadaten (Ansprechpartner/Zugang) je nach Bedarf.
- **Abhängigkeiten**: blockiert E-02 (Hub) und E-04 (Scheduling-Bezug).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-02 — Projekt-360° (Auftrags-Hub)

- **Ziel**: Eine Projekt-Detailansicht bündelt Belege, Termine, Dokumente und später Zeit/Material — Sicht auf die Pipeline „Angebot → Ausführung → Abrechnung“.
- **Reifegrad**: in Arbeit (Stand 2026-04-07)
- **Geliefert (Kurz)**:
  - Hub-Seite `/web/projects/[projectId]` bündelt Belege, Dateien/GAEB, 7-Tage-Termine, Zeiterfassung-Karte und OP-/Mahnungs-Kontext.
  - Aggregierter Hub-Payload `GET /v1/projects/:id/hub` inkl. KPI-/Mini-Pipeline (Progress/Conversion) sowie 30-Tage-Segmente/Trends.
  - UI-Polish: klarere KPI-Hierarchie, Reihenfolge, Mobile-UX.
- **Nächster Fokus**: weitere projektbezogene KPIs/Widgets (z. B. Material nach E-11), Payload-Härtung/Performance nach Bedarf.
- **Abhängigkeiten**: E-01 (Stammdaten), E-04 (Termine), E-05 (Zeit); optional E-06 (Forderungen/OP-Kontext).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-03 — Kundenstamm erweitern (Zahlung & Kommerz)

- **Ziel**: Rechnungsstellung und Mahnung nutzen Kunden-Defaults (Zahlungsziel/Skonto/Mahnfristen) statt manueller Eingabe je Beleg; optional CRM-light/Risiko.
- **Reifegrad**: in Arbeit (Stand 2026-04-07)
- **Geliefert (Kurz)**: Kunden-Defaults für Zahlungsziel/Skonto und Mahnfristen (Stufe 1–3); serverseitiges Prefill von `dueAt` bei Rechnungserstellung; Mahnungen nutzen Defaults als Prefill.
- **Nächster Fokus**: optionale Kommerz-Vertiefung (Kreditlimit, Vorkasse-Flag, Kommunikationsnotizen) sowie DSGVO-Prozess (Export/Löschantrag) als klarer Workflow.
- **Abhängigkeiten**: unterstützt E-06 (Mahnwesen/OP) über Prefill.
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-04 — Terminplanung mit Projekt- und Kundenbezug

- **Ziel**: Einsätze sind (mindestens) optional einem Projekt zugeordnet; Kunde/Baustelle sind dadurch ableitbar und die Planung wird projektfähig.
- **Reifegrad**: in Arbeit (Stand 2026-04-07)
- **Geliefert (Kurz)**: `scheduling_assignments.projectId` (optional) inkl. API-Filter `projectId` sowie Zeitraumfilter `dateFrom`/`dateTo` (max. 31 Tage); Web-Terminplanung mit Projekt-Picker; Projekt-Hub zeigt 7-Tage-Planung und verlinkt nach `/web/scheduling?project=…`.
- **Nächster Fokus**: Policy „Pflicht vs. optional“ je Betrieb, zuverlässiges Vorbefüllen des Orts aus Baustellenadresse; Konflikte/Serien/Sollstunden als nächste Ausbauwelle.
- **Abhängigkeiten**: E-01 stark empfohlen (Stammdaten-Kontext).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-05 — Zeiterfassung (Web, API, Projektbezug)

- **Ziel**: Mitarbeitende erfassen Ist-Zeiten (optional mit Projektbezug) als Basis für Auslastung und Nachkalkulation.
- **Reifegrad**: in Arbeit (Stand 2026-04-07)
- **Geliefert (Kurz)**: `work_time_entries` + CRUD unter `/v1/work-time/entries` sowie Web `/web/work-time`; Projektbezug ist optional.
- **Nächster Fokus**: Soll/Ist-Vergleich gegen Planung (E-04), bessere Auswertungen und konsequentes Deep-Linking (z. B. aus Projekt-Hub).
- **Abhängigkeiten**: E-01; E-04 für Soll-Vergleich.
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-06 — Forderungsmanagement: Mahnung, Zahlung, offene Posten

- **Ziel**: Über „paidAt“ hinaus: Teilzahlungen, Mahnlauf, OP-Liste und nachvollziehbare Zahlungszuordnung.
- **Reifegrad**: in Arbeit (Stand 2026-04-07)
- **Geliefert (Kurz)**:
  - OP-Liste + CSV, Teilzahlungen/Saldo und Mahnhistorie inkl. PDF/Druck.
  - Mahntext-Templates (mehrsprachig) inkl. optionaler Gebühr.
  - CAMT-Matching + persistierter CAMT-Import (idempotent, Historie; ohne Auto-Buchung) sowie Sammelzahlungen (Batch).
  - Mahn-E-Mail-Outbox inkl. Retry-Flow und One-shot-Processing-Entrypoint.
- **Nächster Fokus**: Betriebshärtung der Outbox (Monitoring/Alerting, Backlog/Failed-Schwellen), optional automatisierter Lauf (Cron/Worker), klare Eskalationsregeln (falls gewünscht).
- **Abhängigkeiten**: E-03 (Kunden-Defaults/Prefill) und E-13 (Audit/Permissions) als Querschnitt.
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-07 — Belegtiefe: Steuern, Rabatte, Teilabrechnung, Storno

- **Ziel**: DE-taugliche Belege (Steuern, Rabatte/Skonto, Abschlags-/Schlussrechnungen, Gutschriften) auf bestehender Sales-Basis.
- **Reifegrad**: teilweise umgesetzt (Stand 2026-04-07)
- **Geliefert (Kurz)**: Angebots-/Rechnungsfluss mit Positionen, PDF/Druck und Storno-Basis.
- **Nächster Fokus**: Steuer-Engine (z. B. 7 % / 19 %), Rabatte/Skonto, Teilrechnungsketten + Saldoüberblick, Gutschrift-Logik; optional Leistungsnachweis/Lieferschein.
- **Abhängigkeiten**: E-01 (Stammdaten) und E-08 (GoBD-Finalisierung/Snapshot) eng koordinieren.
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-08 — GoBD & Revisionssicherheit (Belege)

- **Ziel**: Finalisierte Belege sind unveränderbar; Änderungen nur über Revision/Storno mit Audit.
- **Reifegrad**: teilweise umgesetzt (Stand 2026-04-07)
- **Geliefert (Kurz)**: Lifecycle-/Audit-Vorstufe vorhanden.
- **Nächster Fokus**: Finalisieren/Sperren, unveränderliche PDF/XML-Snapshots, konsistente Audit-Events und UI-Sperrlogik.
- **Abhängigkeiten**: E-07 (welche Felder wann frozen) und E-13 (Audit-Querschnitt).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-09 — Export: XRechnung / ZUGFeRD & DATEV-Buchungsstapel

- **Ziel**: Ausgangsrechnungen elektronisch übergeben; DATEV-Export fachlich vollständig (Mapping, Validierung, Fehlerreport).
- **Reifegrad**: teilweise umgesetzt (Stand 2026-04-07)
- **Geliefert (Kurz)**: DATEV Settings + Buchungs-CSV; XRechnung/ZUGFeRD-Endpunkte/Downloadpfade vorhanden.
- **Nächster Fokus**: Standardkonformität/Profil-Tiefe (XRechnung/ZUGFeRD), Validierung/Fehlerreporting, DATEV-Mapping/Tiefe (z. B. Konten/Steuerschlüssel) ausbauen.
- **Abhängigkeiten**: E-07 (Steuerfelder) und E-08 (stabile Snapshots).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-10 — Maler-Module produktiv integrieren

- **Ziel**: Maler-Tools (Aufmaß, GAEB, Mappe, Farben) sind mandanten- und projektbezogen serverseitig nutzbar und fließen in Angebote/Rechnungen ein.
- **Reifegrad**: teilweise umgesetzt (Stand 2026-04-07)
- **Geliefert (Kurz)**: GAEB/LV und Projekt-Assets angebunden; UI-Module vorhanden.
- **Nächster Fokus**: End-to-End-Verknüpfung (Aufmaß/Material → Angebotspositionen), Server-Persistenz statt `localStorage`, stabile Workflows (Upload/Übernahme/Revision).
- **Abhängigkeiten**: E-01/E-02 (Projektkontext) und E-07 (Positions-/Beleglogik).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

---

## Epic E-11 — Materialwirtschaft & Nachkalkulation (MVP)

- **Ziel**: Materialbedarf, Bestellung/Wareneingang und grobe Nachkalkulation pro Projekt (Material + Zeit).
- **Reifegrad**: teilweise vorbereitet (Stand 2026-04-07)
- **Geliefert (Kurz)**: Katalog-/Import-Bausteine (DATANORM/BMEcat) vorhanden; operativer Prozess fehlt.
- **Nächster Fokus**: Minimaler Bestell-/WE-Flow, Projektkosten-Aggregation, Nachkalkulations-Report.
- **Abhängigkeiten**: E-01 (Projekt), E-05 (Zeit) und E-10 (Mengenbasis) empfohlen.
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md)

---

## Epic E-12 — Subunternehmer & Eingangsrechnungen (optional / später)

- **Ziel**: Fremdleistungen inkl. Eingangsrechnungen mit Projektbezug abbilden.
- **Reifegrad**: offen (Stand 2026-04-07)
- **Nächster Fokus**: Scope/Minimalfluss definieren (Supplier light, Eingangsrechnung, ggf. DATEV-Eingang).
- **Abhängigkeiten**: E-01 (Projekt), E-07 (Steuer/Beleglogik) und E-09 (DATEV).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md)

---

## Epic E-13 — Plattform: Rollen fein, Audit quer, Performance, Offline-Strategie

- **Ziel**: Skalierbare Berechtigungen, zentrale Audit-Nachvollziehbarkeit, Performance für große Imports/LVs und klare Offline-/Sync-Strategie.
- **Reifegrad**: teilweise umgesetzt (Stand 2026-04-07)
- **Geliefert (Kurz)**: Rollenmatrix + einzelne Audit-/Lifecycle-Bausteine; Sync-Schema-Baustein vorhanden.
- **Nächster Fokus**: zentrale Audit-Sicht, feinere Action-Permissions, Background-Jobs/Progress/Retry, Produktentscheid Offline/Sync.
- **Abhängigkeiten**: querschnittlich (insb. E-06/E-08).
- **Details**: [`.cursor/maler-lackierer-epic-initiative-briefs.md`](./maler-lackierer-epic-initiative-briefs.md) · [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md)

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

## Nächste Schritte (Stand 2026-04-07)

| Priorität | Thema | Wo |
|-----------|--------|-----|
| **E-06** | **v5 + CAMT + Sammelzahlung** geliefert; **Mahn-E-Mail-Outbox (v6)** + **Retry-Flow + One-shot-Processing** geliefert; nächster Schnitt: Monitoring/Alerting | Rechnungswesen |
| **E-02** | **v2/v3 inkl. UI-Polish geliefert**; nächster Schnitt: weitere projektbezogene KPIs / Material-Widgets (E-11) / Hub-Payload-Härtung nach Bedarf | Projekt-360° |
| **E-07** | Belegtiefe ausbauen (Steuer, Rabatte/Skonto, Teilrechnungsketten, Gutschrift), auf bestehender Sales-Basis | Belege |
| **E-08** | GoBD-Sperren/Finalisieren + Snapshot-Konzept auf vorhandene Audit-Bausteine setzen | Compliance |
| **E-09** | DATEV fachlich vertiefen und XRechnung/ZUGFeRD auf Standardtiefe/Profil-Konformität bringen | Export |
| **Optional** | Playwright E2E: OP-Seite + Mahnung-PDF; API-Tests (Reminders/Payments) | QA |

---

*Diese Datei ergänzt die Funktionslücken-Analyse um planbare Epics; Priorität und Schnitt können sich nach Marktfeedback verschieben.*
