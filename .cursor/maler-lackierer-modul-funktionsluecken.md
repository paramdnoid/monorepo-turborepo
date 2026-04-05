# Funktionslücken-Analyse: Maler & Lackierer (Auftragsbearbeitung & Rechnungswesen)

**Stand der Analyse:** 2026-04-06  
**Bezug:** Screenshot-Navigation (Gruppen *Navigation*, *Stammdaten*, *Belege*, *Team & Planung*) sowie Code unter `apps/web/app/web/`, Shell `apps/web/components/web/shell/web-shell.tsx`, BFF `apps/web/app/api/web/`, Schema `packages/db/src/schema.ts`.

**Ziel dieses Dokuments:** Vollständige, modulweise Liste **fehlender oder nur teilweise vorhandener** Funktionalitäten für ein branchentaugliches Produkt mit **paralleler Frontend-/Backend-Integration**. Bereits vorhandene Bausteine werden kurz benannt, damit Lücken und Beziehungen zwischen Modulen klar werden.

---

## 1. Abgleich Screenshot-Module ↔ aktuelle Implementierung

| Screenshot-Gruppe | Navigationspunkt | Route / technische Einordnung (Ist) |
|--------------------|------------------|-------------------------------------|
| Navigation | Übersicht | `/web` — Dashboard mit KPIs und Listen (BFF: u. a. Sales, Scheduling, Customers) |
| Navigation | Projekte | `/web/projects` — Projektliste, Anlage, Bearbeitung (API) |
| Stammdaten | Kunden | `/web/customers/list` — Kundenstamm inkl. Batch-Aktionen, Export |
| Stammdaten | Adressen | `/web/customers/addresses` — adresszentrierte Sicht |
| Belege | Angebote | `/web/sales/quotes` — CRUD, Positionen, PDF, Druck, Status, Verknüpfung zu Projekt/Kunde |
| Belege | Rechnungen | `/web/sales/invoices` — CRUD, Positionen, PDF, Zahlstatus (`paidAt`), Verknüpfungen |
| Team & Planung | Mitarbeiterverwaltung | `/web/employees` — Stammdaten, Skills, Abwesenheit, Anhänge (API umfangreich) |
| Team & Planung | Terminplanung | `/web/scheduling` — Tages-/Wochenplan, Einsätze, ICS |

**Zusätzlich im Produkt (nicht im Screenshot):** Sidebar-Gruppe *Maler & Tapezierer* mit Routen `/web/painter/<segment>` (u. a. Flächenberechnung, GAEB, DATEV-Schnittstelle, Farbverwaltung, …). Teilbereiche sind **Vorschau/Client-only** oder noch nicht end-to-end angebunden.

---

## 2. Querschnitt: Daten- und Prozessbeziehungen (Ist vs. Lücke)

### 2.1 Kunden ↔ Projekte

- **Ist:** `projects.customerLabel` ist ein **Freitext**; Kundenstamm (`customers`) existiert separat mit `customerId` in Belegen.
- **Lücke:** Keine **durchgängige FK-Verknüpfung Projekt → Kunde** im Sinne eines verbindlichen Stammdaten-Objekts. Folgen: Dubletten, schwierige Auswertungen „Umsatz je Kunde“, eingeschränkte Konsistenz bei Adress-/Zahlungsänderungen, erschwerte Kundenportal-/Kommunikationsprozesse.

### 2.2 Projekte ↔ Belege (Angebote/Rechnungen)

- **Ist:** `salesQuotes` / `salesInvoices` haben `projectId` (optional); UI kann Projekte auswählen.
- **Lücke:** Fehlende **Projekt-Ansicht als 360°-Hub** (alle Belege, Einsätze, Dokumente, Kalkulationen, Material, Zeiten an einem Ort mit Statuspipeline „Angebot → Auftrag → Ausführung → Abrechnung“).

### 2.3 Terminplanung ↔ Projekt / Auftrag / Baustelle

- **Ist:** `schedulingAssignments` (Mitarbeiter, Datum, Zeit, Titel, Ort) **ohne** `projectId` / `customerId` / Baustellenadresse aus Stammdaten.
- **Lücke:** Einsätze sind **inhaltlich nicht mit Auftrags-/Projektobjekt verknüpft** — Kernproblem für Maler: Planung nach Baustelle, Nachweis gegenüber Kunde, Auslastung pro Objekt, spätere Abrechnung/Protokolle.

### 2.4 Branchenmodule (Maler) ↔ operatives Geschäft

- **Ist:** z. B. Flächenberechnung (`area-calculation`) persistiert Modellzustand **lokal (localStorage)**, nicht mandanten- und projektbezogen serverseitig.
- **Lücke:** Keine **einheitliche serverseitige Objektverknüpfung** (Projekt/Angebot/Position) für Aufmaß, LV-Auszug, Materialbedarf — entscheidend für spätere Backend-Integration und Mobile/Offline.

---

## 3. Modul „Übersicht“ (Dashboard)

### Vorhanden (Kurz)

- KPIs: offene Angebote, überfällige Rechnungen, heutige Einsätze, Kunden gesamt; Listen für Dringlichkeit und Tagesplan; Quick Actions.

### Fehlende / zu vertiefende Funktionalitäten

1. **Pipeline Auftragsbearbeitung:** Conversion-Rate Angebot → Auftrag, gewichtete Pipeline, erwarteter Umsatz nach Phase.
2. **Liquidität & Forderungen:** Offene Posten summiert, Zahlungsziel-Überwachung über einfache „überfällig“-Liste hinaus (Zinslauf, Skonto).
3. **Projekt-/Baustellen-KPIs:** Budget vs. Ist (wenn Kosten/Zeiten ergänzt werden), Deckungsbeitrag.
4. **Team-Auslastung:** Kapazität vs. geplante Stunden (benötigt Verknüpfung Planung ↔ Projekt und ggf. Zeiterfassung).
5. **Material & Bestellungen:** (falls eingeführt) kritische Liefertermine, Nachbestellungen — aktuell kein Modul im Screenshot, fachlich aber relevant.
6. **Compliance-/Steuer-Reminder:** z. B. steuerliche Meldefristen (ohne Steuerberatungsanspruch — als technische Erinnerungsfunktion).

---

## 4. Modul „Projekte“

### Vorhanden (Kurz)

- Lebenszyklus-Status, Projektnummer, Freitext-Kunde, Zeitraum, Archiv; Verknüpfung aus Belegen heraus.

### Fehlende Funktionalitäten

1. **Verbindlicher Kundenbezug:** `customerId` + Anzeige/Übernahme Rechnungs-/Lieferadresse aus Stammdaten.
2. **Baustellen-/Objekt-Stammdaten:** eigene Adresse pro Projekt (abweichend vom Kundenstamm), Zugriffs-/Schlüsselinfos, Ansprechpartner vor Ort.
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

1. **Zahlungsbedingungen & Mahnstufen** pro Kunde (Default für neue Rechnungen).
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
7. **Mahnwesen:** Mahnstufen, Gebühren, Templates, E-Mail-Versand, Historie, automatische Eskalation.
8. **Zahlungsabgleich:** Einzel- und Sammelzahlungen, Teilzahlungen, Zuordnung zu Rechnung, offene Posten-Liste.
9. **Elektronische Rechnung:** **XRechnung / ZUGFeRD** (Deutschland/EU-Trend) — Architektur früh mitdenken.
10. **GoBD / Unveränderbarkeit:** revisionssichere Ablage, Revisionen von Belegen, Löschverbote nach Finalisierung.
11. **DATEV-Export:** im System angelegte **Schnittstelle** (BFF-Routen existieren) — fachliche Vollständigkeit Buchungsstapel vs. **Kontenrahmen SKR03/SKR04**, Lieferanten, Debitoren.
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

1. **Projekt-/Kundenbezug** pro Termin (Pflichtfeld optional, aber fachlich zentral).
2. **Routen / Mehr-Baustellen-Tag** (optimierte Reihenfolge — später).
3. **Ressourcenkonflikte:** Überschneidungen, Doppelbuchung, Kapazität pro Team.
4. **Soll-/Ist-Stunden** je Einsatz (Brücke zur Zeiterfassung).
5. **Wiederkehrende Termine** (Wartung, mehrphasige Objekte).

---

## 9. Querschnitt „Auftragsbearbeitung“ (nicht nur ein Menüpunkt)

Funktionen, die typischerweise **mehrere Module** verbinden — derzeit **nicht oder nur rudimentär** abgedeckt:

1. **Zeiterfassung** (mobil & web): Zuordnung zu **Projekt** und **Mitarbeiter**, optional **Leistungsposition**; Export für Lohn (extern) oder interne Ist-Kalkulation.
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
| DATEV-Schnittstelle | Mapping Konten, Steuerschlüssel, Buchungsperiode, Fehlerbehandlung |
| Farbmanagement | Bereits teilweise API (`userColorPreferences`, `teamColorPalettes`) — Lücke: Nutzung in Belegtexten/Arbeitsanweisungen |

Zusätzlich existieren **Platzhalter-Seiten** („Vorschau — Funktionen folgen“) für nicht explizit gemappte Segmente.

---

## 11. Nicht-funktionale und organisationale Themen (für spätere Integration)

1. **Rollen & Berechtigungen:** fein granular pro Modul (Lesen/Schreiben/Export) — teils vorhanden (`web-permissions`); Ausbaustufe für Tätigkeitstrennung (Buchhaltung vs. Bauleitung).
2. **Audit-Log** mandantenweit für Belege und Stammdaten (Revisionssicherheit).
3. **Multi-Mandant:** bereits angelegt — **Organisationseinstellungen** (Firmenlogo, Bank, Fußzeile PDF) konsistent in allen Belegen.
4. **Performance bei großen LV:** Importe, Pagination, Hintergrundjobs.
5. **Offline / App:** Sync-Konzept (`syncMutationReceipts` im Schema) — Produktentscheid für Maler vor Ort.

---

## 12. Priorisierung (Empfehlung, keine Umsetzung)

Für **Auftragsbearbeitung + Rechnungswesen** Maler/Lackierer typischerweise:

1. **Stammdaten konsolidieren:** Projekt ↔ Kunde ↔ Baustelle.  
2. **Scheduling mit Projekt/Baustelle verknüpfen.**  
3. **Zeiterfassung** mit Projektbezug.  
4. **Mahn- und Zahlungsabgleich** bei Rechnungen.  
5. **Steuer/Belegtiefe** nach Zielmarkt (DE).  
6. **XRechnung / DATEV**-Export qualitativ schließen.  
7. **Material/Purchase** anbinden, sobald Kataloge im Produkt genutzt werden.

---

## 13. Referenz auf Code-Oberfläche (Orientierung)

- Shell & Navigation: `apps/web/components/web/shell/web-shell.tsx`
- Painter-Routen: `apps/web/app/web/painter/[module]/page.tsx`, Registry `apps/web/lib/trades/painter-modules.ts`
- BFF-Spiegel: `apps/web/app/api/web/**`
- Datenmodell: `packages/db/src/schema.ts` (u. a. `projects`, `customers`, `salesQuotes`, `salesInvoices`, `schedulingAssignments`, `project_assets`, `lv_documents`)

---

*Ende der Analyse-Datei — kann als Ausgangspunkt für Roadmap, Epics und API-/Contract-Erweiterungen dienen.*
