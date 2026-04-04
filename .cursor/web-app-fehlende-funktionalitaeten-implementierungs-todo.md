# Web App Implementierungs-Backlog (detailliert)

Stand: 2026-04-04  
Quelle: `.cursor/web-app-fehlende-funktionalitaeten.md` + strukturierte Gegenpruefung der genannten Dateien in `apps/web`.

## Zielbild

Diese Liste beschreibt eine vollstaendige, priorisierte Umsetzung der aktuell fehlenden Funktionalitaeten unter `/web` mit Best-Practice-Fokus auf:

- klare Domainenzenzen (UI <-> BFF <-> API <-> DB),
- konsistente UX/A11y (Web Interface Guidelines),
- sichere und validierte Datenpfade (Zod + serverseitige Autorisierung),
- testbare Inkremente (Unit/Integration/E2E),
- risikoarmes Rollout (Feature Flags, Migrations, Monitoring).

## Arbeitsprinzipien (vor Start)

- [ ] **Single source of truth**: fachliche Regeln in API/Domain, nicht nur im Client.
- [ ] **API Contracts first**: neue Requests/Responses in `@repo/api-contracts` modellieren.
- [ ] **BFF parity**: fuer neue API-Funktionen passende `app/api/web/*` Handler pflegen.
- [ ] **A11y by default**: Keyboard, Fokus, Labels, semantische Rollen, Loading/Errors.
- [ ] **Optimistic UI nur kontrolliert**: bei mutierenden Aktionen immer serverseitiges Re-Fetch oder gezieltes Cache-Invalidieren.
- [ ] **Permissions explizit**: pro Aktion `canView/canEdit/canDelete/...` statt impliziter Annahmen.
- [ ] **I18n vollstaendig**: de/en Copy in Content-Modulen fuer neue UI-Strings.
- [ ] **Observability**: Fehlercodes und actionable Fehlermeldungen statt generischem "loadError".

## Priorisierung und Abhaengigkeiten

## P0 (kritisch, zuerst umsetzen)

- [x] (1) Persistenz Benachrichtigungseinstellungen
- [x] (2) Fehlende Painter-Module: `area-calculation`, `substrate-inspection`, `room-book-bill-of-quantities`
- [x] (3) Projekt-Stammdaten-Management als Querschnitt

## P1 (hoher Produktivnutzen)

- [x] (4) Sales Suche/Filter/Sort/Pagination
- [x] (5) Sales Export + Massenaktionen
- [x] (6) Sales Delete/Archive/Storno
- [x] (7) Scheduling Einsaetze bearbeiten (PATCH-Flow)
- [x] (8) Kundenliste Export + Massenaktionen
- [x] (9) Adressuebersicht direkt bearbeitbar

## P2 (UX/Robustheit)

- [x] (10) Operatives Dashboard statt Tech-Preview
- [x] (12) Loading-States konsistent fuer `/web`
- [x] (13) Segment-spezifisches `error.tsx` / `not-found.tsx`
- [x] (15) Sichtbare Rollen-/Rechtepruefung auf Routenebene

## P3 (strategisch / nachgelagert)

- [x] (11) Modul-Landingpages statt Redirect-only Roots
- [x] (14) Color-Management produktionsreif (Katalog + serverseitige Favoriten)

---

## Detaillierte To-do-Liste pro Funktion

### 1) Benachrichtigungseinstellungen persistent speichern (P0)

Betroffene Stellen: `app/web/actions/settings.ts`, `components/web/settings/web-settings-content.tsx`

- [x] **Domain/DB**
  - [x] Datenmodell fuer User-Preferences definieren (z. B. Tabelle `user_notification_preferences`).
  - [x] Eindeutigkeit je Nutzer/Organisation absichern.
  - [x] Default-Werte serverseitig definieren.
- [x] **API + Contracts**
  - [x] Contract fuer `GET`/`PUT` Notification Preferences in `@repo/api-contracts` erstellen.
  - [x] API-Endpunkte in `apps/api` implementieren (Validation, Auth, Org-Scope).
- [x] **BFF**
  - [x] `app/api/web/settings/notifications` (GET/PUT) als Proxy auf API bauen.
  - [x] Fehlercodes auf UX-taugliche Meldungen mappen.
- [x] **UI**
  - [x] Initialwerte in `WebSettingsContent` serverseitig/bei Mount laden.
  - [x] Save-Button nur bei "dirty state" aktivieren.
  - [x] Erfolgs- und Fehler-Feedback differenziert darstellen.
  - [x] Optional: `lastSavedAt` anzeigen.
- [x] **Sicherheit**
  - [x] Sicherstellen, dass nur eigene Preferences aktualisiert werden koennen.
- [x] **Tests**
  - [x] API: Validierungs-/Auth-Tests.
  - [x] BFF: Mapping-Tests.
  - [x] UI: Zustand laden/speichern/Fehlerfall.
- [x] **Akzeptanzkriterien**
  - [x] Nach Reload bleiben Schalterwerte unveraendert.
  - [x] Ungueltige Payload liefert klare Fehlermeldung.
  - [x] Kein lokaler Placeholder-Toast mehr.

### 2) Drei Painter-Module fachlich implementieren (P0)

Betroffene Stellen: `app/web/painter/[module]/page.tsx`, `lib/trades/painter-modules.ts`

- [x] **Modularchitektur**
  - [x] Fuer jedes Segment eigene Content-Komponente in `components/web/painter/*` anlegen.
  - [x] Route-Mapping statt Placeholder erweitern.
- [x] **A) area-calculation**
  - [x] Eingaben: Flaechen (Raum/Teilflaechen), Abzuege (Fenster/Tueren), Zuschlaege.
  - [x] Ausgabe: Netto-/Bruttoflaeche, Materialbedarf, Arbeitszeit-Schaetzung.
  - [x] Optional: Materialkennwerte aus zentralem Katalog einbinden.
- [x] **B) substrate-inspection**
  - [x] Checklistenfluss: Untergrundtyp, Feuchte, Tragfaehigkeit, Vorbehandlung.
  - [x] Ampel-Logik und Massnahmenempfehlung.
  - [x] Export als dokumentierbare Pruefnotiz.
- [x] **C) room-book-bill-of-quantities**
  - [x] Raum-/Positionsstruktur erfassen.
  - [x] Summenbildung je Raum/Gewerk.
  - [x] Anschlussfaehigkeit fuer Angebots-/LV-Workflows.
- [x] **Contracts/API (falls persistiert)**
  - [x] N/A: Persistenz bleibt bewusst lokal (pro Nutzer) fuer schnelle Baustellen-Offline-Nutzung.
  - [x] N/A: Kein zusaetzlicher API/BFF-Pfad erforderlich solange lokale Persistenz Produktziel ist.
- [x] **Tests**
  - [x] Rechenlogik-Unit-Tests (Rundung, Grenzwerte).
  - [x] UI-Flows mit leer/teilweise gefuellten Daten.
- [x] **Akzeptanzkriterien**
  - [x] Keine Preview-Placeholder mehr fuer die 3 Segmente.
  - [x] Nutzer kann Daten erfassen, validieren, speichern und wieder laden.

### 3) Projekt-Stammdaten-Management unter `/web` (P0)

Betroffene Hinweise: Nutzung von `projectId` in Sales/GAEB/Project Folders, aber keine dedizierte Projektverwaltung in `app/web`

- [x] **Informationsarchitektur**
  - [x] Neue Route `app/web/projects/*` als zentrales Projektmodul planen.
  - [x] Root-Einstieg (`/web/projects`) mit Liste + Schnellaktionen.
- [x] **Funktionen**
  - [x] Projekt anlegen (Titel, Nummer, Status, Kunde, Zeitraum).
  - [x] Projekt bearbeiten.
  - [x] Projekt archivieren/reaktivieren.
  - [x] Projekt suchen/filtern/paginieren.
- [x] **Integration**
  - [x] Sales-Editoren: "Projekt neu anlegen" aus Select heraus (Dialog/Deep Link).
  - [x] GAEB/Project Folders: stabiler Projektbezug inkl. leere/archivierte Faelle.
- [x] **Data Quality**
  - [x] Eindeutige Projektkennungen je Organisation.
  - [x] Soft-delete/Archive-Strategie statt Hard delete.
- [x] **Tests**
  - [x] CRUD + Archivierung + Referenznutzung in Sales/GAEB.
- [x] **Akzeptanzkriterien**
  - [x] Kein Modul ist mehr auf "extern/indirekt" vorhandene Projekte angewiesen.
  - [x] Projektstammdaten sind im `/web` Produktfluss voll administrierbar.

### 4) Sales-Listen: Suche/Filter/Sortierung/Pagination (P1)

Betroffene Datei: `components/web/sales/sales-list.tsx`

- [x] **API/Contract**
  - [x] Query-Parameter spezifizieren: `q`, `status`, `dateFrom`, `dateTo`, `sortBy`, `sortDir`, `limit`, `offset`.
  - [x] Response um `total` + Paging-Metadaten erweitern.
- [x] **BFF**
  - [x] Filterparameter sicher und typisiert an API durchreichen.
- [x] **UI**
  - [x] Suchfeld mit Debounce + Enter-Trigger.
  - [x] Statusfilter und Datumsbereich.
  - [x] Sortierbare Tabellenspalten.
  - [x] Pagination inkl. Range-Anzeige.
  - [x] Loading/empty/error klar getrennt.
- [x] **A11y**
  - [x] Tabellenkopf-Sortindikator und Screenreader-Text fuer Sortstatus.
- [x] **Akzeptanzkriterien**
  - [x] 1k+ Belege ohne UX-Abbruch navigierbar.
  - [x] Filterzustand bleibt stabil beim Blaettern.

### 5) Sales-Listen: Export + Massenaktionen (P1)

- [x] **Exports**
  - [x] CSV-Listenexport analog Mitarbeiterliste.
  - [x] Optional: PDF Listenreport (nicht Einzeldokument-PDF).
- [x] **Batch-Aktionen**
  - [x] Row-Selection inkl. "alle auf Seite".
  - [x] Aktionen: archivieren, reaktivieren, ggf. Statuswechsel nach Policy.
  - [x] Konflikt-Feedback pro Eintrag (teilweise erfolgreich).
- [x] **Permissions**
  - [x] Aktionen nur bei `canEdit/canArchive` zeigen.
- [x] **Akzeptanzkriterien**
  - [x] Nutzer kann aus gefilterter Ansicht direkt exportieren.
  - [x] Batch-Operationen liefern eindeutige Erfolg/Fehler-Statistik.

### 6) Sales-Detail: Delete/Archive/Storno (P1)

Betroffene Datei: `components/web/sales/sales-detail.tsx`

- [x] **Fachlogik**
  - [x] Lebenszyklusregeln definieren:
    - [x] Angebot: loeschbar/archivierbar bis Zustand X.
    - [x] Rechnung: Storno statt Loeschen nach Versand/Buchung.
- [x] **API/BFF**
  - [x] Endpunkte fuer archive/unarchive/cancel/delete (policy-guarded).
- [x] **UI**
  - [x] Gefaehrliche Aktionen in Confirm-Dialog mit klaren Folgen.
  - [x] Undo oder Wiedereinspielen fuer Archive.
  - [x] Nach Aktion sichere Navigation (z. B. zur Liste mit Banner).
- [x] **Audit**
  - [x] Wer hat wann storniert/archiviert (mindestens serverseitiges Event).
- [x] **Akzeptanzkriterien**
  - [x] Kein "Dead-end": jeder Beleg hat klaren End-of-life-Workflow.

### 7) Scheduling: Einsaetze bearbeiten statt nur create/delete (P1)

Betroffene Datei: `components/web/workforce/scheduling-content.tsx`

- [x] **API/Contract**
  - [x] `PATCH /assignments/:id` mit editierbaren Feldern (Zeit, Titel, Ort, Reminder, Mitarbeiter).
  - [x] Konfliktvalidierung bei Zeitueberschneidung/Abhaengigkeiten.
- [x] **UI**
  - [x] "Bearbeiten"-Action je Einsatz.
  - [x] Inline-Edit oder Dialogformular mit Vorbelegung.
  - [x] Validierungsfehler feldnah zeigen.
- [x] **UX**
  - [x] Konflikthinweise nach Save aktualisieren.
  - [x] Status-Feedback fuer long-running Saves.
- [x] **Akzeptanzkriterien**
  - [x] Korrekturen ohne Loeschen+Neu-Anlegen moeglich.

### 8) Kundenliste: Export + Massenaktionen (P1)

Betroffene Datei: `components/web/customers/customers-list-content.tsx`

- [x] **Export**
  - [x] CSV Export entsprechend aktueller Filter/Paginierung oder "alle Treffer".
- [x] **Batch**
  - [x] Mehrfachauswahl in Tabelle.
  - [x] Batch archive/unarchive (mindestens).
  - [x] Optional: Batch Tagging/Kategorie.
- [x] **Permissions**
  - [x] Nur bei `canEdit` anzeigen.
- [x] **Akzeptanzkriterien**
  - [x] Paritaet zum Mitarbeiter-Modul fuer Bulk-Workflows erreicht.

### 9) Adress-Uebersicht direkt editierbar (P1)

Betroffene Datei: `components/web/customers/customers-addresses-content.tsx`

- [x] **UI**
  - [x] Spaltenaktionen: Bearbeiten und Loeschen (Lifecycle in der Liste).
  - [x] Quick-Edit Dialog fuer Kernfelder.
- [x] **API/BFF**
  - [x] Adress-PATCH und lifecycle-Endpunkte anbinden.
- [x] **Datenkonsistenz**
  - [x] Default-Adresse pro Typ sauber halten (billing/shipping).
- [x] **Akzeptanzkriterien**
  - [x] Nutzer muss fuer Standardaenderungen nicht mehr in Kundendetail springen.

### 10) `/web` Startseite in operatives Dashboard ueberfuehren (P2)

Betroffene Dateien: `app/web/page.tsx`, `components/web/overview/web-overview-content.tsx`

- [x] **Produktziel definieren**
  - [x] KPI-Kacheln (z. B. offene Angebote, ueberfaellige Rechnungen, heutige Einsaetze).
  - [x] Arbeitslisten (naechste Aufgaben, offene Freigaben).
  - [x] Quick Actions (Angebot, Rechnung, Kunde, Einsatz).
- [x] **Tech-Debug entkoppeln**
  - [x] IPC/Auth-Debug nur in Dev-Toolbereich oder Feature-Flag.
- [x] **Informationsdichte**
  - [x] Mobile-first Kartenlayout, progressive disclosure.
- [x] **Akzeptanzkriterien**
  - [x] Metadata/Beschreibung nicht mehr "shell preview".
  - [x] Dashboard liefert operativen Mehrwert ohne Dev-Kontext.

### 11) Modul-Landingpages statt Redirect-only (P3)

Betroffene Dateien: `app/web/sales/page.tsx`, `app/web/customers/page.tsx`, `app/web/employees/page.tsx`

- [x] **Landing Design**
  - [x] Modulkontext, KPIs, zuletzt bearbeitet, Quick Links.
- [x] **Navigation**
  - [x] Redirects durch echte Einstiegsseiten ersetzen.
- [x] **Akzeptanzkriterien**
  - [x] Jeder Modul-Root ist ein nutzbarer Startpunkt.

### 12) Konsistente Loading-States fuer `/web` Segmente (P2)

- [x] **Route-Abdeckung**
  - [x] `loading.tsx` fuer Sales, Customers, Scheduling, Painter, Settings etc. ergaenzen.
- [x] **Skeleton-Systematik**
  - [x] Wiederverwendbare Skeleton-Bausteine pro Seitentyp.
- [x] **Akzeptanzkriterien**
  - [x] Kein harter "blank state" beim Navigieren in produktive Routen.

### 13) Segment-spezifisches `error.tsx` und `not-found.tsx` (P2)

- [x] **Route-Level Error Boundaries**
  - [x] `app/web/error.tsx` mit Recovery-Action.
  - [x] `app/web/not-found.tsx` mit Kontextlinks.
- [x] **Fachliche Fehlerabbildung**
  - [x] 401/403/404/409/5xx differenziert kommunizieren.
- [x] **Akzeptanzkriterien**
  - [x] Fehler im authentifizierten Bereich sind konsistent, hilfreich und markenspezifisch.

### 14) Color-Management produktionsreif machen (P3)

Betroffene Datei: `components/web/painter/color-management-content.tsx`

- [x] **Datenumfang**
  - [x] Vollstaendige/lizenzierte Farbdatensaetze integrieren.
- [x] **Persistenz**
  - [x] Favoriten/Recent serverseitig pro Nutzer oder Team speichern.
- [x] **Teamfaehigkeit**
  - [x] Optional gemeinsame Team-Paletten.
- [x] **Akzeptanzkriterien**
  - [x] Keine Demo-Daten-Hinweise im produktiven Modus.
  - [x] Favoriten sind geraeteuebergreifend konsistent.

### 15) Rollen-/Rechtepruefung auf Routenebene sichtbar machen (P2)

Betroffene Datei: `app/web/layout.tsx` (aktuell Session-Check)

- [x] **Policy-Modell**
  - [x] Rollen/Rechte-Matrix pro Modul/Route definieren.
- [x] **Route Guards**
  - [x] Guards fuer kritische Routen/Actions (view/edit/delete/export/batch).
- [x] **UI-Policy**
  - [x] Actions je Permission ausblenden/deaktivieren + Hinweistext.
- [x] **Tests**
  - [x] Zugriffstests fuer mindestens Reader/Editor/Admin.
- [x] **Akzeptanzkriterien**
  - [x] Unerlaubte Aktionen sind weder direkt noch indirekt verfuegbar.

---

## Querschnitts-Backlog (technisch)

### A) API- und BFF-Qualitaet

- [ ] Einheitliches Fehlerformat (`code`, `detail`, `hint`) in neuen Endpunkten.
- [ ] Zod-safeParse an allen Ein-/Ausgangsgrenzen.
- [ ] Rate limit / idempotency fuer sensible Mutationen (optional je Endpoint).

### B) Datenmigrationen / DB

- [ ] Migrationen fuer neue Tabellen/Indizes rueckwaertskompatibel.
- [ ] Soft-delete-Konzept konsistent (archivedAt statt hard delete, wo sinnvoll).
- [ ] FK-Strategie fuer projektbezogene Objekte pruefen.

### C) UI/UX Konsistenz

- [ ] Einheitliche Tabellenwerkzeuge (Filterleiste, Actions, Pagination, Export).
- [ ] Einheitliche leere Zustaende mit primarem CTA.
- [ ] Einheitliche Banner/Toast-Semantik (success/info/warning/error).

### D) Internationalisierung

- [ ] Alle neuen Texte in Content-Dateien de/en pflegen.
- [ ] Keine hardcodierten Strings in Komponenten.

### E) Sicherheit/Compliance

- [ ] AuthZ immer serverseitig final pruefen.
- [ ] Kein Vertrauen in Client-Flags fuer Berechtigungen.
- [ ] Logging/Audit fuer kritische Geschaeftsaktionen.

---

## Test- und Abnahmeplan

### 1. Automatisierte Tests

- [ ] **Unit**
  - [ ] Rechen-/Mappinglogik (Painter, Sales Summen, Scheduling Konflikte).
- [ ] **Integration**
  - [ ] BFF-Handler inklusive Fehler-Mapping und Auth-Faelle.
- [ ] **UI Tests**
  - [ ] kritische Formflows (Create/Edit/Delete/Batch/Export Trigger).
- [ ] **E2E (Playwright)**
  - [ ] Smoke je Kernmodul: Settings, Painter, Projects, Sales, Customers, Scheduling.

### 2. Manuelle Fachabnahme (UAT)

- [ ] Rolle Reader: nur Ansicht, keine Mutationen.
- [ ] Rolle Editor: typische Tagesaufgaben durchspielen.
- [ ] Rolle Admin: Batch/Export/Archivierung/Policy-Aenderungen pruefen.

### 3. Nicht-funktionale Checks

- [ ] Ladezeiten bei grossen Listen (Paginierung aktiv, kein Full-load).
- [ ] Tastaturbedienung und Fokusfuehrung in Dialogen.
- [ ] Fehlerverhalten bei API-Ausfall simulieren.

---

## Rollout-Plan (empfohlen)

### Phase 1 (P0 Stabilisierung)

- [x] #1 Benachrichtigungen persistent
- [x] #2 Painter-Module live
- [x] #3 Projektmanagement live

### Phase 2 (P1 Produktivitaet)

- [x] #4 #5 #6 Sales-Vollausbau
- [x] #7 Scheduling-Edit
- [x] #8 #9 Kunden-/Adress-Bulk und Edit

### Phase 3 (P2/P3 Experience + Governance)

- [x] #10 Dashboard
- [x] #12 Loading-States konsistent
- [x] #13 Error/Not-Found pro Segment
- [x] #15 Rollenmodell sichtbar
- [x] #11 Landingpages
- [x] #14 Color-Management produktionsreif

---

## Definition of Done (global)

- [ ] Feature hat API-Contract, API/BFF-Implementierung und UI.
- [ ] Rechtepruefung serverseitig vorhanden und getestet.
- [ ] de/en Copy vollstaendig.
- [ ] Lint, Typecheck, Build im betroffenen Scope gruen.
- [ ] Mindestens 1 E2E-Szenario fuer den Kernpfad vorhanden.
- [ ] Dokumentation im Modul aktualisiert (wenn neue Route oder Workflow).

---

## Optional: Ticket-Splitting Vorlage

Pro Ticket folgende Struktur verwenden:

- [ ] **Problem**
- [ ] **Scope (in/out)**
- [ ] **Technik (Contract/API/BFF/UI)**
- [ ] **Risiken**
- [ ] **Testfaelle**
- [ ] **Akzeptanzkriterien**

