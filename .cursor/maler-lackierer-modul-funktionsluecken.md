# Funktionslücken-Analyse: Maler & Lackierer (Auftragsbearbeitung & Rechnungswesen)

**Stand der Analyse:** 2026-04-06  
**Bezug:** Screenshot-Navigation (Gruppen *Navigation*, *Stammdaten*, *Belege*, *Team & Planung*) sowie Code unter `apps/web/app/web/`, Shell `apps/web/components/web/shell/web-shell.tsx`, BFF `apps/web/app/api/web/`, Schema `packages/db/src/schema.ts`.

## Änderungsstand (vollständig abgeglichen)

- Forderungsmanagement auf tatsächlichen Umfang gehoben (E-06 v5-Basis + **persistierter** CAMT-Dateiimport + **Sammelzahlungen** + **Mehrfach-CAMT-Zeilen → Sammelzahlung** auf der OP-Seite).
- DATEV von „nur Schnittstelle“ auf „Basis produktiv vorhanden“ präzisiert (Settings + Buchungs-CSV; fachliche Tiefe offen).
- Zeiterfassung/Scheduling/Audit als „teilweise umgesetzt“ differenziert, statt pauschal offen.

**Ziel dieses Dokuments:** Vollständige, modulweise Liste **fehlender oder nur teilweise vorhandener** Funktionalitäten für ein branchentaugliches Produkt mit **paralleler Frontend-/Backend-Integration**. Bereits vorhandene Bausteine werden kurz benannt, damit Lücken und Beziehungen zwischen Modulen klar werden.

---

## Nicht mehr als Lücke zu werten (Stand jetzt)

- E-01-Basis: Projekt-Kunden-/Baustellenbezug (mit Legacy-Fallback) ist geliefert.
- E-02-Basis: Projekt-Hub mit Belegen/Dateien/GAEB/7-Tage-Termine/Zeiterfassung/OP ist geliefert.
- E-06-v5-Basis: Mahntext-Templates + optionale Gebühr + PDF/Druck + Einstellungs-UI sowie E-Mail-/CAMT-Spike; **CAMT-XML-Upload** mit Vorschau, **Persistenz/Idempotenz** (Hash) und **Import-Historie**; **keine** automatische Zahlungsbuchung aus CAMT; **Sammelzahlung** mehrerer OP-Rechnungen in einem Buchungslauf (`POST …/payments/batch`) inkl. UI; **Übernahme mehrerer CAMT-Zeilen** in die Sammelwahl (Auswahl + Prefill, Summe pro Rechnung bei mehrfachen Treffern).
- DATEV-Basis: Settings + Ausgangs-Buchungs-CSV sind geliefert (Vertiefung bleibt Backlog).

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
- **Status:** in Arbeit (E-02) — Hub unter `/web/projects/[projectId]` liefert Stammdaten + projektbezogene Belege/Dateien/GAEB, **Terminplanung naechste 7 Tage**, Zeiterfassung (Monat bis heute + letzte Buchungen), Forderungen/OP (Top-OP, Mahnungs-Kurzinfo + Druck/PDF letzte Mahnung, Link `…#invoice-reminders`). Rest: Mini-Pipeline/KPIs, Material (E-11), optional Hub-Aggregations-API.

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
2. **Liquidität & Forderungen:** Teilzahlungen/Saldo **pro Rechnung** sind erfasst; mandantenweite **OP-Liste** inkl. CSV unter `/web/sales/invoices/open` umgesetzt (optional `projectId`-Filter fuer Projektkontext); **Mahnwesen (manuell)** inkl. Historie + PDF/Druck ist umgesetzt; **Mahntexte und optionale Mahngebuehr** pro Mandant (Stufe 1–10, `de`/`en`) unter Einstellungen, genutzt in PDF/Druck inkl. Platzhalter-Auflösung (z. B. Belegnr./Betrag/Fälligkeit). Zudem sind **E-Mail-Spike** (Dry-Run + optional SMTP-Send), **CAMT-Matching-Spike** (Top-Kandidat + Buchung im Rechnungsdetail), **CAMT-Dateiimport** (XML-Upload, Vorschau, Persistenz/Idempotenz, Historie) und **Sammelzahlungen/Mehrfachzuordnung** (Batch-API + OP-UI; mehrere CAMT-Zeilen → Sammelzahlung) umgesetzt. Projekt-Hub zeigt eine projektbezogene OP-Karte. Weiterhin offen: Forecast (Zinslauf, Skonto), produktiver Mailversand (Queue/Retry).
3. **Projekt-/Baustellen-KPIs:** Budget vs. Ist (wenn Kosten/Zeiten ergänzt werden), Deckungsbeitrag.
4. **Team-Auslastung:** Kapazität vs. geplante Stunden (benötigt Verknüpfung Planung ↔ Projekt und ggf. Zeiterfassung).
5. **Material & Bestellungen:** (falls eingeführt) kritische Liefertermine, Nachbestellungen — aktuell kein Modul im Screenshot, fachlich aber relevant.
6. **Compliance-/Steuer-Reminder:** z. B. steuerliche Meldefristen (ohne Steuerberatungsanspruch — als technische Erinnerungsfunktion).

---

## 4. Modul „Projekte“

### Vorhanden (Kurz)

- Lebenszyklus-Status, Projektnummer, Freitext-Kunde, Zeitraum, Archiv; Verknüpfung aus Belegen heraus.
- Projekt-Hub (`/web/projects/[projectId]`) mit Belegen, Dateien, GAEB, Terminplanung (**7 Tage**), Zeiterfassungs-Karte und OP-Karte inkl. Mahnungs-Verknuepfung (projektbezogen).

### Fehlende Funktionalitäten

1. **Verbindlicher Kundenbezug:** umgesetzt (E-01) — `projects.customerId` + UI-Auswahl aus Kundenstamm. (Adressen-Übernahme in Belege folgt in nachgelagerten Epics.)
2. **Baustellen-/Objekt-Stammdaten:** teilweise umgesetzt (E-01) — pro Projekt eine Referenz auf Kundenadresse (`projects.siteAddressId`). Offene Punkte: zusaetzliche Felder (Zugriff/Schluessel/Ansprechpartner) und ggf. eigene Projektadresse unabhängig vom Kundenstamm.
3. **Auftragsarten:** Innen/Außen, Neubau/Renovierung, Subunternehmer-Anteile — für Planung und Abrechnung.
4. **Leistungsbeschreibung / Leistungsverzeichnis-Light:** nicht nur LV-Import (GAEB), sondern **interne** strukturierte Leistung für wiederkehrende Maler-Pakete.
5. **Budget & Kostenstellen:** auch wenn nur „einfach“ — Schätzung vs. Ist für Handwerker-KMU üblich.
6. **Digitale Baustellenmappe:** `project_assets` existiert im Schema — **UI/Workflow** zur strukturierten Ablage (Fotos, Pläne, Abnahmen) und Verknüpfung mit Belegen/Einsätzen (falls API/UI noch nicht vollständig).
7. **Meilensteine / Checklisten:** Abnahme, Zwischentermin, „lackierfertig“ — operative Steuerung.

---

## 5. Stammdaten „Kunden“ & „Adressen“

### Vorhanden (Kurz)

- Kunden CRUD, Kategorien, Archiv, Batch, CSV-Export; Adressarten; Detailseiten inkl. Karten/Geocoding (soweit angebunden).

### Fehlende Funktionalitäten

1. **Zahlungsbedingungen & Mahnstufen** pro Kunde (Default für neue Rechnungen/Mahnungen). **Status:** umgesetzt als Basis (E-03) — `paymentTermsDays` + Skonto-Felder im Kundenstamm; `dueAt` wird bei neuer Rechnung serverseitig vorbelegt, wenn nicht ueberschrieben; Mahnfristen-Defaults (`reminderLevel1DaysAfterDue`/`reminderLevel2DaysAfterDue`/`reminderLevel3DaysAfterDue`) sind editierbar und werden bei Mahnungen als Prefill genutzt.
2. **Kreditlimit / Risiko-Flags** (optional, aber im B2B-Rechnungswesen üblich).
3. **Mehrere Rollen:** Auftraggeber vs. Rechnungsempfänger vs. Objekteigentümer (Maler-Alltag: Vermieter/Mieter, Generalunternehmer).
4. **SEPA-Mandate / Bankverbindung** (sensible Daten — nur mit klarer Security-Story).
5. **Kommunikationsprotokoll:** dokumentierte Anrufe/Mails (CRM-light) — Verknüpfung zu Angebot/Auftrag.
6. **DSGVO:** Einwilligungen, Datenminimierung, Löschkonzept pro Kunde (Prozess + UI).

---

## 6. Belege: Angebote & Rechnungen (Kern Rechnungswesen & Auftragsbearbeitung)

### Vorhanden (Kurz)

- Positionen, Beträge, Währung, Status, PDF/Druck, Archivierung, Verknüpfung Angebot → Rechnung, Projekt- und Kundenbezug, `paidAt` bei Rechnungen.

### Fehlende / typische Handwerks-/DE-Funktionalitäten

1. **Steuerliche Tiefe:** getrennte Ausweisung 7%/19% (oder dynamisch nach Reform), Kleinunternehmer-Hinweis, Reverse Charge, Befreiungen — je nach Scope **Regelengine** statt nur Gesamtbetrag.
2. **Rabatte, Skonto, Abschläge** auf Beleg- und Positionslevel.
3. **Teilrechnungen, Abschlagsrechnungen, Schlussrechnung** mit **Saldoüberblick** zum Auftrag.
4. **Gutschriften / Stornos** mit nachvollziehbarer Buchhaltungslogik (nicht nur „cancel“).
5. **Lieferscheine / Leistungsnachweise** als eigener Belegtyp (Material und/oder Stunden/Leistung) — oft **Voraussetzung** für spätere Rechnung und Streitbeilegung.
6. **Auftragsbestätigung** (vom angenommenen Angebot) als eigener Schritt inkl. Bedingungen.
7. **Mahnwesen:** manuelle Mahnstufen + Historie + PDF/Druck sind umgesetzt; **Templates + optionale Gebuehr** (PDF/Druck, Einstellungen) umgesetzt; Platzhalter im Text sind umgesetzt; **E-Mail-Spike** im Rechnungsdetail ist umgesetzt. Offen: produktiver Versandprozess (Queue/Retry/Audit), automatische Eskalation.
8. **Zahlungsabgleich:** **Teilzahlungen und Saldo pro Rechnung** sind umgesetzt (API + UI); **einzelne Zahlungszeilen löschen** (Korrektur) umgesetzt; **CAMT-Zuordnungs-Spike** (Kandidaten-Ranking + Top-Match-Buchung), **CAMT-Dateiimport** (Vorschau, Persistenz/Idempotenz, Historie; keine Massen-Auto-Buchung) und **Sammelzahlungen** (eine Buchung, mehrere Rechnungen/Teilbeträge) sind umgesetzt. Weiterhin offen: Ausgleich gegen **Kundenkonto** (außerhalb der OP-Sammelzahlung), produktiver Bankimport **ohne** manuelle OP-Zuordnung (z. B. HBCI/PSD2), falls gewünscht.
9. **Elektronische Rechnung:** **XRechnung / ZUGFeRD** (Deutschland/EU-Trend) — Architektur früh mitdenken.
10. **GoBD / Unveränderbarkeit:** revisionssichere Ablage, Revisionen von Belegen, Löschverbote nach Finalisierung.
11. **DATEV-Export:** im System angebunden (Settings + Buchungs-CSV fuer Ausgangsrechnungen) — fachliche Vollständigkeit Buchungsstapel (z. B. Zahlungsbuchungen/erweiterte Mapping-Faelle) bleibt offen.
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

### Fehlende Funktionalitäten

1. **Projekt-/Kundenbezug** pro Termin — **teilweise umgesetzt** (optional `project_id`, E-04 v1); offen: Pflicht-Policy, bessere Defaults aus Baustelle.
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
4. **Mahn- und Zahlungsabgleich** bei Rechnungen — Teilzahlungen/Saldo **v1**, OP-Liste/CSV und Korrektur Zahlungszeile **v2**, Mahnung/Historie + PDF/Druck **v3**, Mahntext-Templates/Gebuehr **v4**, E-Mail-/CAMT-Spike **v5-Basis**, **CAMT-Dateiimport** (inkl. Persistenz/Historie) und **Sammelzahlungen** (inkl. CAMT-Mehrfach-Prefill) erledigt; produktiver Mailversand **offen**.  
5. **Steuer/Belegtiefe** nach Zielmarkt (DE).  
6. **XRechnung / ZUGFeRD starten** und **DATEV** qualitativ vertiefen.  
7. **Material/Purchase** anbinden, sobald Kataloge im Produkt genutzt werden.

---

## 13. Referenz auf Code-Oberfläche (Orientierung)

- Shell & Navigation: `apps/web/components/web/shell/web-shell.tsx`
- Painter-Routen: `apps/web/app/web/painter/[module]/page.tsx`, Registry `apps/web/lib/trades/painter-modules.ts`
- BFF-Spiegel: `apps/web/app/api/web/**`
- Datenmodell: `packages/db/src/schema.ts` (u. a. `projects`, `customers`, `salesQuotes`, `salesInvoices`, `salesInvoicePayments`, `schedulingAssignments`, `project_assets`, `lv_documents`)

---

*Ende der Analyse-Datei — kann als Ausgangspunkt für Roadmap, Epics und API-/Contract-Erweiterungen dienen.*
