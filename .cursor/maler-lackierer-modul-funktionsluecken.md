# Funktionslücken-Analyse: Maler & Lackierer (Auftragsbearbeitung & Rechnungswesen)

**Stand der Analyse:** 2026-04-07  
**Status-Quelle (Reifegrade):** [`.cursor/maler-lackierer-doc-code-verification.md`](./maler-lackierer-doc-code-verification.md) → „Status-Baseline (E-01 bis E-13)“  
**Bezug:** Screenshot-Navigation (Gruppen *Navigation*, *Stammdaten*, *Belege*, *Team & Planung*) sowie Code unter `apps/web/app/web/`, Shell `apps/web/components/web/shell/web-shell.tsx`, BFF `apps/web/app/api/web/`, Schema `packages/db/src/schema.ts`.

## Änderungsstand (vollständig abgeglichen)

- E-06 aktualisiert: OP/CAMT/Batch inkl. **Mahn-E-Mail-Outbox**; offen bleibt v. a. Betriebshärtung (Monitoring/Alerting, Automatisierung).
- E-09 präzisiert: DATEV-Basis + XRechnung/ZUGFeRD-Endpunkte vorhanden; Standardkonformität/Profil-Tiefe offen.
- Scheduling/Zeiterfassung/Audit differenziert (teilweise umgesetzt) statt pauschal offen.

**Ziel dieses Dokuments:** Vollständige, modulweise Liste **fehlender oder nur teilweise vorhandener** Funktionalitäten für ein branchentaugliches Produkt mit **paralleler Frontend-/Backend-Integration**. Bereits vorhandene Bausteine werden kurz benannt, damit Lücken und Beziehungen zwischen Modulen klar werden.

---

## Bereits geliefert (Kurz, kein „Gap“)

- **E-01**: Projekt ↔ Kunde ↔ Baustelle (Basis) geliefert.
- **E-02**: Projekt-Hub v1–v3 (inkl. KPI/Pipeline + 30-Tage-Segmente/Trends + UI-Polish) geliefert.
- **E-03/E-04/E-05**: Kunden-Defaults, Scheduling-Projektbezug/Zeitraumfilter und Zeiterfassung-Basis geliefert.
- **E-06**: OP/Mahnung/CAMT/Batch + Mahn-E-Mail-Outbox geliefert (Betriebshärtung/Automatisierung Backlog).
- **E-09**: DATEV Settings + Buchungs-CSV sowie XRechnung/ZUGFeRD-Endpunkte vorhanden (Standardtiefe Backlog).

---

## 1. Abgleich Screenshot-Module ↔ aktuelle Implementierung

| Screenshot-Gruppe | Navigationspunkt | Route / technische Einordnung (Ist) |
|--------------------|------------------|-------------------------------------|
| Navigation | Übersicht | `/web` — Dashboard mit KPIs und Listen (BFF: u. a. Sales, Scheduling, Customers) |
| Navigation | Projekte | `/web/projects` — Projektliste, Anlage, Bearbeitung (API) |
| Stammdaten | Kunden | `/web/customers/list` — Kundenstamm inkl. Batch-Aktionen, Export |
| Stammdaten | Adressen | `/web/customers/addresses` — adresszentrierte Sicht |
| Belege | Angebote | `/web/sales/quotes` — CRUD, Positionen, PDF, Druck, Status, Verknüpfung zu Projekt/Kunde |
| Belege | Rechnungen | `/web/sales/invoices` — CRUD, Positionen, PDF, Zahlstatus (`paidAt`), **Teilzahlungen** (`sales_invoice_payments`, Saldo, Löschen einzelner Zeilen), **Mahnungen** (Historie, PDF/Druck; **Mahntext/Gebuehr** mandantenweit unter Einstellungen), **Offene Posten** `/web/sales/invoices/open` (+ CSV-Export), Verknüpfungen |
| Team & Planung | Mitarbeiterverwaltung | `/web/employees` — Stammdaten, Skills, Abwesenheit, Anhänge (API umfangreich) |
| Team & Planung | Terminplanung | `/web/scheduling` — Tages-/Wochenplan, Einsätze, ICS |

**Zusätzlich im Produkt (nicht im Screenshot):** Sidebar-Gruppe *Maler & Tapezierer* mit Routen `/web/painter/<segment>` (u. a. Flächenberechnung, GAEB, DATEV-Schnittstelle, Farbverwaltung, …). Teilbereiche sind **Vorschau/Client-only** oder noch nicht end-to-end angebunden.

---

## 2. Querschnitt: Daten- und Prozessbeziehungen (Ist vs. Lücke)

### 2.1 Kunden ↔ Projekte

- **Ist:** Projekte koennen jetzt optional **verbindlich** mit dem Kundenstamm verknuepft werden (`projects.customerId`), inkl. optionaler Baustellenadresse-Referenz (`projects.siteAddressId`). Legacy-Freitext (`projects.customerLabel`) bleibt als Fallback moeglich.
- **Status:** umgesetzt (E-01, 2026-04-06). Rest: Migration/Backfill operativ ausfuehren und Altdaten nachpflegen.

### 2.2 Projekte ↔ Belege (Angebote/Rechnungen)

- **Ist:** `salesQuotes` / `salesInvoices` haben `projectId` (optional); UI kann Projekte auswählen.
- **Status:** in Arbeit (E-02) — Hub unter `/web/projects/[projectId]` liefert Stammdaten + projektbezogene Belege/Dateien/GAEB, **Terminplanung naechste 7 Tage**, Zeiterfassung (Monat bis heute + letzte Buchungen), Forderungen/OP (Top-OP, Mahnungs-Kurzinfo + Druck/PDF letzte Mahnung, Link `…#invoice-reminders`). Aggregierter API-Pfad (`GET /v1/projects/:id/hub`) liefert **KPI-/Mini-Pipeline**, 30-Tage-Segmente/Trends und eine **aufgeraeumte KPI-Karte** (Hierarchie, Mobile); Rest: weiterfuehrende projektbezogene KPIs/Material-Widgets (E-11) nach Roadmap.

### 2.3 Terminplanung ↔ Projekt / Auftrag / Baustelle

- **Ist:** `schedulingAssignments` hat optional **`project_id`** (FK auf `projects`); UI/API mit Projekt-Picker und Filtern (E-04, erste Iteration). **`GET /v1/scheduling/assignments`** unterstuetzt zusaetzlich **`dateFrom`/`dateTo`** (Zeitraum, max. 31 Tage) neben einem einzelnen **`date`**. Kunde/Baustelle sind über das Projekt ableitbar, nicht denormalisiert auf dem Termin.
- **Rest-Lücken:** Pflicht vs. optional pro Betrieb; „Ort“ aus Baustellenadresse zuverlässig vorbefüllen; Ressourcenkonflikte / Routen (später).

### 2.4 Branchenmodule (Maler) ↔ operatives Geschäft

- **Ist:** z. B. Flächenberechnung (`area-calculation`) persistiert Modellzustand **lokal (localStorage)**, nicht mandanten- und projektbezogen serverseitig.
- **Lücke:** Keine **einheitliche serverseitige Objektverknüpfung** (Projekt/Angebot/Position) für Aufmaß, LV-Auszug, Materialbedarf — entscheidend für spätere Backend-Integration und Mobile/Offline.

---

## 3. Modul „Übersicht“ (Dashboard)

### Vorhanden (Kurz)

- KPIs: offene Angebote, überfällige Rechnungen, heutige Einsätze, Kunden gesamt; Listen für Dringlichkeit und Tagesplan; Quick Actions.

### Fehlende / zu vertiefende Funktionalitäten

1. **Pipeline Auftragsbearbeitung:** Conversion-Rate Angebot → Auftrag, gewichtete Pipeline, erwarteter Umsatz nach Phase.
2. **Liquidität & Forderungen (Dashboard-Ebene):** Forecast/Trend-Kennzahlen (z. B. DSO, Überfälligkeit), Skonto-/Cashflow-Vorschau sowie Outbox-/Versand-Kennzahlen (Backlog, Failed) inkl. Alerting; Details zu OP/Mahnung/CAMT siehe Modul 6 und Verifikation.
3. **Projekt-/Baustellen-KPIs:** Budget vs. Ist (wenn Kosten/Zeiten ergänzt werden), Deckungsbeitrag.
4. **Team-Auslastung:** Kapazität vs. geplante Stunden (benötigt Verknüpfung Planung ↔ Projekt und ggf. Zeiterfassung).
5. **Material & Bestellungen:** (falls eingeführt) kritische Liefertermine, Nachbestellungen — aktuell kein Modul im Screenshot, fachlich aber relevant.
6. **Compliance-/Steuer-Reminder:** z. B. steuerliche Meldefristen (ohne Steuerberatungsanspruch — als technische Erinnerungsfunktion).

---

## 4. Modul „Projekte“

### Vorhanden (Kurz)

- Lebenszyklus-Status, Projektnummer, Freitext-Kunde, Zeitraum, Archiv; Verknüpfung aus Belegen heraus.
- Projekt-Hub (`/web/projects/[projectId]`) mit Belegen, Dateien, GAEB, Terminplanung (**7 Tage**), Zeiterfassungs-Karte und OP-Karte inkl. Mahnungs-Verknuepfung (projektbezogen); aggregierte **KPI-/Pipeline-/Segment-Ansicht** ueber `GET /v1/projects/:id/hub`.

### Fehlende Funktionalitäten

1. **Baustellen-/Objekt-Stammdaten (Vertiefung):** zusätzliche Felder (Zugriff/Schlüssel/Ansprechpartner) und ggf. eigene Projektadresse unabhängig vom Kundenstamm.
2. **Auftragsarten:** Innen/Außen, Neubau/Renovierung, Subunternehmer-Anteile — für Planung und Abrechnung.
3. **Leistungsbeschreibung / Leistungsverzeichnis-Light:** nicht nur LV-Import (GAEB), sondern interne strukturierte Leistung für wiederkehrende Maler-Pakete.
4. **Budget & Kostenstellen:** auch wenn nur „einfach“ — Schätzung vs. Ist für Handwerker-KMU üblich.
5. **Digitale Baustellenmappe (Produktiv-Workflow/Struktur):** strukturierte Ablage (Tags/Kategorien, Abnahmen/Protokolle) und Verknüpfung mit Belegen/Einsätzen.
6. **Meilensteine / Checklisten:** Abnahme, Zwischentermin, „lackierfertig“ — operative Steuerung.

---

## 5. Stammdaten „Kunden“ & „Adressen“

### Vorhanden (Kurz)

- Kunden CRUD, Kategorien, Archiv, Batch, CSV-Export; Adressarten; Detailseiten inkl. Karten/Geocoding (soweit angebunden).
- Kommerz-Defaults: Zahlungsziel/Skonto und Mahnfristen-Defaults pro Kunde (Prefill für Rechnungen/Mahnungen).

### Fehlende Funktionalitäten

1. **Kreditlimit / Risiko-Flags** (optional, aber im B2B-Rechnungswesen üblich).
2. **Mehrere Rollen:** Auftraggeber vs. Rechnungsempfänger vs. Objekteigentümer (Maler-Alltag: Vermieter/Mieter, Generalunternehmer).
3. **SEPA-Mandate / Bankverbindung** (sensible Daten — nur mit klarer Security-Story).
4. **Kommunikationsprotokoll:** dokumentierte Anrufe/Mails (CRM-light) — Verknüpfung zu Angebot/Auftrag.
5. **DSGVO:** Einwilligungen, Datenminimierung, Löschkonzept pro Kunde (Prozess + UI).

---

## 6. Belege: Angebote & Rechnungen (Kern Rechnungswesen & Auftragsbearbeitung)

### Vorhanden (Kurz)

- Positionen, Beträge, Währung, Status, PDF/Druck, Archivierung, Verknüpfung Angebot → Rechnung, Projekt- und Kundenbezug, `paidAt` bei Rechnungen.
- Forderungsmanagement-Basis: Teilzahlungen/Saldo, OP-Liste + CSV, Mahnhistorie + PDF/Druck, Mahntext-Templates/Gebühr, CAMT-Matching/Import (persistiert) + Sammelzahlungen sowie Mahn-E-Mail-Outbox.

### Fehlende / typische Handwerks-/DE-Funktionalitäten

1. **Steuerliche Tiefe:** getrennte Ausweisung 7%/19% (oder dynamisch nach Reform), Kleinunternehmer-Hinweis, Reverse Charge, Befreiungen — je nach Scope **Regelengine** statt nur Gesamtbetrag.
2. **Rabatte, Skonto, Abschläge** auf Beleg- und Positionslevel.
3. **Teilrechnungen, Abschlagsrechnungen, Schlussrechnung** mit **Saldoüberblick** zum Auftrag.
4. **Gutschriften / Stornos** mit nachvollziehbarer Buchhaltungslogik (nicht nur „cancel“).
5. **Lieferscheine / Leistungsnachweise** als eigener Belegtyp (Material und/oder Stunden/Leistung) — oft **Voraussetzung** für spätere Rechnung und Streitbeilegung.
6. **Auftragsbestätigung** (vom angenommenen Angebot) als eigener Schritt inkl. Bedingungen.
7. **Mahnwesen (Betrieb & Automatisierung):** Monitoring/Alerting für Outbox (Backlog/Failed), automatisierter Lauf (Cron/Worker) und Eskalationsregeln (falls gewünscht).
8. **Zahlungsabgleich (optional vertiefen):** Ausgleich gegen Kundenkonto/Überzahlungen (außerhalb Batch), automatischer Bankimport (PSD2/HBCI) und weniger manuelle Zuordnung (nur falls gewünscht).
9. **Elektronische Rechnung (Vertiefung):** XRechnung/ZUGFeRD-Endpunkte sind vorhanden; Standardkonformität und Profil-Tiefe weiter ausbauen.
10. **GoBD / Unveränderbarkeit:** revisionssichere Ablage, Revisionen von Belegen, Löschverbote nach Finalisierung.
11. **DATEV-Export (Vertiefung):** Settings + Buchungs-CSV für Ausgangsrechnungen vorhanden; fachliche Vollständigkeit (z. B. Zahlungsbuchungen/erweiterte Mapping-Fälle) bleibt offen.
12. **Leistungszeiträume / §13b-Hinweise** wo relevant (Schnittstelle zu Steuer-Fachkonzept).
13. **Angebots-Vergleich / Versionierung:** mehrere Versionen eines Angebots, Nachverhandlung dokumentiert.

---

## 7. Team & Planung: Mitarbeiterverwaltung

### Vorhanden (Kurz)

- Umfangreiche API: Profile, Skills-Katalog, Urlaub, Krankheit, Beziehungen, Anhänge, Aktivität, Export.

### Fehlende branchenspezifische Ergänzungen

1. **Qualifikationen Maler:** z. B. Lackierer, Brandschutz, Gerüst (wenn relevant), Nachweise mit Ablaufdatum.
2. **Kosten-/Lohnzuordnung:** Stundensätze intern (Kalkulation Angebot) — **ohne Lohnbuchhaltung** kann man zumindest **Kalkulationsannahmen** pflegen.
3. **Verknüpfung zu Projekten/Einsätzen:** siehe Scheduling; sonst bleibt Personalstamm isoliert.

---

## 8. Team & Planung: Terminplanung

### Vorhanden (Kurz)

- Kalenderansicht, Einsätze, Abhängigkeiten/Warnungen (z. B. Urlaub), ICS-Export.
- Projektbezug je Einsatz ist als Basis vorhanden (optional `project_id` inkl. Filter/Zeitraum in API/UI).

### Fehlende Funktionalitäten

1. **Projekt-/Kundenbezug (Vertiefung):** Pflicht-Policy, bessere Defaults aus Baustelle, konsistente Anzeige Kunde/Baustelle im Kalender.
2. **Routen / Mehr-Baustellen-Tag** (optimierte Reihenfolge — später).
3. **Ressourcenkonflikte:** Überschneidungen, Doppelbuchung, Kapazität pro Team.
4. **Soll-/Ist-Stunden** je Einsatz (Brücke zur Zeiterfassung).
5. **Wiederkehrende Termine** (Wartung, mehrphasige Objekte).

---

## 9. Querschnitt „Auftragsbearbeitung“ (nicht nur ein Menüpunkt)

Funktionen, die typischerweise **mehrere Module** verbinden — derzeit **nicht oder nur rudimentär** abgedeckt:

1. **Zeiterfassung** (mobil & web): Zuordnung zu **Projekt** und **Mitarbeiter** ist als Basis da (Projekt optional), optional **Leistungsposition** weiterhin offen; Export für Lohn (extern) oder interne Ist-Kalkulation offen.
2. **Materialwirtschaft:** Bedarf aus Aufmaß/LV, Bestellung, Wareneingang, Zuordnung zum Projekt, Preis aus Katalog (DATANORM/BMEcat liegt im Monorepo als Bibliothek — **Produktintegration** in Auftrags- und Rechnungsfluss fehlt als durchgängiger Prozess).
3. **Nachkalkulation:** Angebotspreis vs. Ist (Material + Zeit).
4. **Baustellenprotokolle / Mängel:** Fotos, Unterschrift, PDF-Protokoll — rechtlich und operativ relevant.
5. **Subunternehmer:** Beauftragung, Abnahme, Rechnungseingang (Eingangsrechnungen) — großer Block für wachsende Betriebe.

---

## 10. Zusätzliche Sidebar-Module „Maler & Tapezierer“ (Repo)

Kurz die **Integrationslücke** je Richtung (Details je Komponente können im Code nachgelesen werden):

| Segment (Beispiel) | Typische Lücke für „fertiges“ Produkt |
|--------------------|----------------------------------------|
| Flächenberechnung | Server-/Projekt-Persistenz, Übernahme in Angebotspositionen, Normen/Tapetenrollen |
| GAEB / LV | Workflow von Import bis Angebotspositionen inkl. Differenz zum Nachtrag |
| Digitale Projektmappen | End-to-end mit `project_assets`, Berechtigungen, Vorschau |
| Untergrundprüfung / Raumbuch | Felder für Haftung/Nachweis, Verknüpfung zu Angebot |
| Großhandel / Material | Bestellprozess, Lager, Preisaktualisierung |
| DATEV-Schnittstelle | Basis vorhanden (Settings + Buchungs-CSV); offen: tieferes Mapping, Fehlerbehandlung, breiterer Exportumfang |
| Farbmanagement | Bereits teilweise API (`userColorPreferences`, `teamColorPalettes`) — Lücke: Nutzung in Belegtexten/Arbeitsanweisungen |

Zusätzlich existieren **Platzhalter-Seiten** („Vorschau — Funktionen folgen“) für nicht explizit gemappte Segmente.

---

## 11. Nicht-funktionale und organisationale Themen (für spätere Integration)

1. **Rollen & Berechtigungen:** fein granular pro Modul (Lesen/Schreiben/Export) — teils vorhanden (`web-permissions`); Ausbaustufe für Tätigkeitstrennung (Buchhaltung vs. Bauleitung).
2. **Audit-Log** mandantenweit für Belege und Stammdaten (Revisionssicherheit). Teilbausteine sind da (z. B. Lifecycle-/Aktivitäts-Events), aber keine zentrale Audit-Sicht.
3. **Multi-Mandant:** bereits angelegt — **Organisationseinstellungen** (Firmenlogo, Bank, Fußzeile PDF) konsistent in allen Belegen.
4. **Performance bei großen LV:** Importe, Pagination, Hintergrundjobs.
5. **Offline / App:** Sync-Konzept (`syncMutationReceipts` im Schema) — Produktentscheid für Maler vor Ort.

---

## 12. Priorisierung (Empfehlung, keine Umsetzung)

Für **Auftragsbearbeitung + Rechnungswesen** Maler/Lackierer typischerweise:

1. **Stammdaten konsolidieren:** Projekt ↔ Kunde ↔ Baustelle.  
2. **Scheduling mit Projekt/Baustelle verknüpfen.**  
3. **Zeiterfassung** mit Projektbezug.  
4. **Mahn- und Zahlungsabgleich (E-06):** OP/Teilzahlungen/Mahnungen/Templates/CAMT/Batch + Mahn-E-Mail-Outbox geliefert; offen: Monitoring/Alerting, ggf. automatisierter Lauf und Eskalationsregeln.  
5. **Steuer/Belegtiefe** nach Zielmarkt (DE).  
6. **XRechnung / ZUGFeRD standardisieren** (Profil-Tiefe) und **DATEV** qualitativ vertiefen.  
7. **Material/Purchase** anbinden, sobald Kataloge im Produkt genutzt werden.

---

## 13. Referenz auf Code-Oberfläche (Orientierung)

- Shell & Navigation: `apps/web/components/web/shell/web-shell.tsx`
- Painter-Routen: `apps/web/app/web/painter/[module]/page.tsx`, Registry `apps/web/lib/trades/painter-modules.ts`
- BFF-Spiegel: `apps/web/app/api/web/**`
- Datenmodell: `packages/db/src/schema.ts` (u. a. `projects`, `customers`, `salesQuotes`, `salesInvoices`, `salesInvoicePayments`, `schedulingAssignments`, `project_assets`, `lv_documents`)

---

*Ende der Analyse-Datei — kann als Ausgangspunkt für Roadmap, Epics und API-/Contract-Erweiterungen dienen.*
