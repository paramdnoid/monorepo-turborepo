# Analyse: Fehlende Funktionalitaeten in `apps/web/app/web`

Stand: 2026-04-04  
Scope: Routen unter `apps/web/app/web` plus direkt genutzte UI-Logik in `apps/web/components/web`.

## Kritisch / Hoch

1. **Benachrichtigungseinstellungen werden persistent gespeichert (umgesetzt)**
   - Status: umgesetzt (DB + API + BFF + UI).
   - Umsetzung:
     - `packages/db`: Tabelle `user_notification_preferences` + Migration `packages/db/drizzle/0019_*`
     - `apps/api`: `GET/PUT /v1/settings/notifications`
     - `apps/web`: BFF `GET/PUT /api/web/settings/notifications`
     - `apps/web`: `WebSettingsContent` laedt initial, Dirty-State, `lastSavedAt`
     - `apps/web/app/web/settings/notification-preferences-client.test.ts`: UI-nahe Load/Save/Error-Logik getestet

2. **Drei Maler-Module sind nicht mehr Preview (umgesetzt)**
   - Status: umgesetzt (keine Placeholder mehr + zentraler Materialkatalog + Tests).
   - Umsetzung:
     - `apps/web/components/web/painter/area-calculation-content.tsx`
     - `apps/web/components/web/painter/substrate-inspection-content.tsx`
     - `apps/web/components/web/painter/room-book-bill-of-quantities-content.tsx`
     - Mapping in `apps/web/app/web/painter/[module]/page.tsx`
     - `apps/web/lib/painter/material-catalog.ts`: zentrale Materialprofile fuer Richtwerte (Deckkraft/Leistung/Verschnitt/Anstriche)
     - `apps/web/lib/painter/*.test.ts`: Unit-Tests fuer Rechen-/Risikologik inkl. leerer und teilweise gefuellter Daten
   - Hinweis: „Speichern/Wieder laden“ erfolgt aktuell **clientseitig (localStorage)** pro Benutzer (E-Mail).

3. **Projekt-Stammdaten-Management im `/web`-Bereich (umgesetzt)**
   - Status: umgesetzt.
   - Umsetzung:
     - `apps/web/app/web/projects/page.tsx` + `apps/web/components/web/projects/projects-management-content.tsx`
     - `apps/api/src/routes/projects.ts` erweitert (List mit Suche/Filter/Pagination + Create + Patch/Archive)
     - `apps/web/app/api/web/projects` erweitert (`GET` Query-Passthrough, `POST`, `PATCH /[projectId]`)
     - Deep-Links zur Projektverwaltung in Sales-/GAEB-/Projektmappen-Flows
     - `apps/api/src/routes/projects-sales-gaeb.test.ts`: API-Tests fuer Projekt-CRUD/Archivierung sowie Referenzpruefung in Sales/GAEB

## Mittel

4. **Sales-Listen mit Suche, Filter, Sortierung und Pagination (umgesetzt)**
   - Status: umgesetzt (Contract + API + BFF + UI).
   - Umsetzung:
     - `packages/api-contracts/src/sales.ts`: Query-Schemas (`q`, `status`, `dateFrom`, `dateTo`, `sortBy`, `sortDir`, `limit`, `offset`) und List-Responses mit `total`
     - `apps/api/src/routes/sales.ts`: serverseitige Filter-/Sort-/Paging-Logik fuer Quotes und Invoices
     - `apps/web/app/api/web/sales/quotes/route.ts` + `apps/web/app/api/web/sales/invoices/route.ts`: Query-Passthrough
     - `apps/web/components/web/sales/sales-list.tsx`: Debounce-Suche, Status-/Datumsfilter, sortierbare Header, Paging inkl. Range und A11y-Sortstatus

5. **Sales-Listen mit CSV-Export und Massenaktionen (umgesetzt)**
   - Status: umgesetzt (inkl. PDF-Listenreport und Permissions-gesteuerten Aktionen).
   - Umsetzung:
     - `apps/web/components/web/sales/sales-list.tsx`: CSV-Export fuer die aktive gefilterte Ansicht
     - `apps/web/components/web/sales/sales-list.tsx`: PDF-Listenreport (druckbare Listenansicht, als PDF speicherbar)
     - `apps/web/components/web/sales/sales-list.tsx`: Mehrfachauswahl inkl. "alle auf Seite"
     - `apps/web/components/web/sales/sales-list.tsx`: Batch-Statuswechsel fuer Quotes/Invoices mit Teil-Erfolgsfeedback
     - `packages/api-contracts/src/sales.ts` + `apps/api/src/routes/sales.ts`: Listenantworten inkl. `permissions` (`canEdit/canArchive/canExport/canBatch`) und serverseitige Mutations-Policy (`forbidden` bei fehlender Rolle)

6. **Sales-Detail mit Delete/Archive/Storno-Workflow (umgesetzt)**
   - Status: umgesetzt (API + BFF + UI-Confirm-Flow + serverseitiges Audit-Event).
   - Umsetzung:
     - `apps/api/src/routes/sales.ts`: Lifecycle-Endpunkte und Statusregeln (`archive/unarchive/delete` fuer Quotes, `cancel/delete` fuer Invoices)
     - `apps/api/src/routes/sales.ts` + `packages/db/src/schema.ts`: persistente Audit-Events `sales_lifecycle_events` fuer `quote_archived|quote_unarchived|quote_deleted|invoice_cancelled|invoice_deleted` inkl. Actor (`sub`) und Zeitstempel
     - `apps/web/app/api/web/sales/...`: passende BFF-Routen fuer die neuen Aktionen
     - `apps/web/components/web/sales/sales-detail.tsx`: Actions mit Confirm-Dialog, klare Fehlermeldungen und sichere Ruecknavigation zur Liste nach Delete

7. **Terminplanung: Einsaetze lassen sich bearbeiten (umgesetzt)**
   - Status: umgesetzt (Contract + API + BFF + UI).
   - Umsetzung:
     - `packages/api-contracts/src/scheduling.ts`: `schedulingAssignmentPatchSchema` fuer validierten PATCH-Flow
     - `apps/api/src/routes/scheduling.ts`: `PATCH /v1/scheduling/assignments/:id` inkl. Konfliktpruefung (Slot + Abhaengigkeiten)
     - `apps/web/app/api/web/scheduling/assignments/[id]/route.ts`: BFF-Proxy fuer PATCH
     - `apps/web/components/web/workforce/scheduling-content.tsx`: "Bearbeiten"-Action, Dialog mit Vorbelegung, feldnahe Validierungsfehler und Save-Feedback

8. **Kundenliste mit Export- und Massenaktionen (umgesetzt)**
   - Status: umgesetzt (inkl. optionalem Batch-Tagging/Kategorie).
   - Umsetzung:
     - `packages/db/src/schema.ts` + `packages/db/drizzle/0023_lazy_fantastic_four.sql`: Kundenkategorie als persistentes Feld
     - `packages/api-contracts/src/customers.ts`: Kategorie in List/Detail/Create/Patch + Batch-Update-Contract (Archivierung und/oder Kategorie)
     - `apps/api/src/routes/customers.ts`: `POST /v1/customers/batch` mit Kategorie-Updates + `canEdit`-Flag in List-Response
     - `apps/web/app/api/web/customers/batch/route.ts`: BFF-Proxy fuer Batch-Aktionen
     - `apps/web/components/web/customers/customers-list-content.tsx`: CSV-Export (alle Treffer), Mehrfachauswahl, Batch Archive/Restore + Batch-Kategorie setzen/loeschen

9. **Adress-Uebersicht direkt bearbeitbar (umgesetzt)**
   - Status: umgesetzt (API/BFF-Anbindung + Quick-Edit + Lifecycle-Aktionen).
   - Umsetzung:
     - `apps/web/components/web/customers/customers-addresses-content.tsx`: Spaltenaktionen fuer Bearbeiten/Loeschen + Quick-Edit-Dialog in der Uebersicht
     - `apps/web/components/web/customers/customer-detail-address-edit-dialog.tsx`: wiederverwendeter Edit-Dialog auch fuer die Adress-Uebersicht
     - `apps/api/src/routes/customers.ts`: Konsistenzlogik fuer Standardadressen je Typ bei Patch/Delete/Post (`ensureDefaultAddressForKind`)

10. **`/web`-Startseite als operatives Dashboard (umgesetzt)**
   - Status: umgesetzt (operative KPIs + Arbeitslisten + Quick Actions).
   - Umsetzung:
     - `apps/web/app/web/page.tsx`: Metadata von "shell preview" auf operatives Dashboard umgestellt
     - `apps/web/components/web/overview/web-overview-content.tsx`: neue Dashboard-Ansicht mit KPI-Kacheln, Arbeitslisten (ueberfaellige Rechnungen, Follow-up-Angebote, heutige Einsaetze) und Quick Actions
     - Tech-Debug-Abschnitte (IPC/Auth-Rohdaten) aus der produktiven Uebersicht entfernt

## Niedrig

11. **Modul-Rootseiten als eigenstaendige Landingpages (umgesetzt)**
   - Status: umgesetzt (Modulkontext + KPIs + zuletzt bearbeitet + Quick Links).
   - Umsetzung:
     - `apps/web/app/web/sales/page.tsx`, `apps/web/app/web/customers/page.tsx`, `apps/web/app/web/employees/page.tsx` von Redirect auf echte Einstiegsseiten umgestellt.
     - Neue Landing-Komponenten:
       - `apps/web/components/web/sales/sales-module-landing-content.tsx`
       - `apps/web/components/web/customers/customers-module-landing-content.tsx`
       - `apps/web/components/web/workforce/workforce-module-landing-content.tsx`
     - Jede Landingseite zeigt Modulkontext, KPI-Karten, einen „zuletzt bearbeitet“-Bereich sowie Quick Links in zentrale Modul-Flows.
     - `apps/web/content/sales-module.ts`: Root-Header-Metadaten fuer `/web/sales` ergänzt.

12. **Route-UX: Loading-States fuer produktive `/web`-Segmente konsistent (umgesetzt)**
   - Status: umgesetzt (route-seitige Abdeckung + wiederverwendbare Skeleton-Bausteine).
   - Umsetzung:
     - Wiederverwendbare Skeleton-Bausteine in `apps/web/app/web/_components/web-route-loading.tsx`
     - Neue `loading.tsx`-Segmente fuer `web`, `sales`, `customers`, `scheduling`, `painter`, `settings`, `projects` inkl. `painter/[module]`
   - Ergebnis:
     - Kein harter Blank-State beim Segmentwechsel in den wichtigsten produktiven `/web`-Routen.

13. **Segment-spezifisches `not-found.tsx` / `error.tsx` fuer `/web` (umgesetzt)**
   - Status: umgesetzt (Recovery + Kontext-Navigation).
   - Umsetzung:
     - `apps/web/app/web/error.tsx`: Segment-Error-Boundary mit Retry, Reload, Login-Fallback und kontextbezogenen Navigationszielen
     - `apps/web/app/web/not-found.tsx`: Produktbereich-spezifische 404-Seite mit klaren Einstiegslinks
     - Fehlerklassifikation fuer 401/403/404/409/5xx in der `error.tsx`-Darstellung

14. **Color-Management produktionsreif (umgesetzt)**
   - Status: umgesetzt (serverseitige Persistenz + Team-Palette + produktiver Datenhinweis).
   - Umsetzung:
     - `apps/web/components/web/painter/color-management-content.tsx`: User-/Team-Palettenumschaltung, serverseitiges Laden/Speichern (`/api/web/settings/colors`), Team-Read-only-Handling nach Berechtigung.
     - `apps/web/lib/colors/filter-colors.ts`: NCS-Katalog nicht mehr als Preview beschnitten (voller Katalog ohne Suchbegriff).
     - `apps/web/app/api/web/settings/colors/route.ts`: BFF-Proxy fuer `GET/PUT` der Farb-Paletten.
     - `apps/api/src/routes/settings.ts` + `apps/api/src/auth/permissions.ts`: neue API-Handler fuer User-/Team-Paletten inkl. AuthZ fuer Team-Updates.
     - `packages/db/src/schema.ts` + `packages/db/drizzle/0021_flat_gray_hulk.sql`: neue Persistenztabellen `user_color_preferences` und `team_color_palettes`.
     - `packages/api-contracts/src/settings.ts`: gemeinsame Zod-Contracts fuer Color-Palette Request/Response.

15. **Feingranulare Rollen-/Rechtepruefung auf Routenebene sichtbar (umgesetzt)**
   - Status: umgesetzt (Policy-Matrix + Route-Guards + UI-Hinweise + Tests).
   - Umsetzung:
     - `apps/web/lib/auth/web-permissions.ts`: zentrale Rollen-/Rechte-Matrix je Modul (`canView/canEdit/canDelete/canExport/canBatch`) plus Route-Guard-Entscheidung.
     - `apps/web/lib/auth/session-user.ts`: Rollen aus JWT (`realm_access`/`resource_access`) extrahiert und als Session-Permissions bereitgestellt.
     - `apps/web/app/web/layout.tsx`: route-spezifische Guard-Pruefung fuer view/edit-sensitive Routen mit sicherem Fallback-Redirect.
     - `apps/web/components/web/shell/web-shell.tsx`: sichtbare Policy-Hinweise (Denied-Banner, Read-only-Hinweis, Navigation nach `canView`).
     - `apps/web/components/web/overview/web-overview-content.tsx`: Quick Actions werden bei fehlendem Edit-Recht deaktiviert.
     - `apps/web/lib/auth/web-permissions.test.ts`: Zugriffstests fuer Reader/Editor/Admin-Szenarien inkl. Guard-Entscheidungen.

## Kurzfazit

Die zuvor priorisierten P0/P1-Themen sowie P2 und P3 sind inklusive der offenen Restpunkte (**#2 optionaler Katalog + Tests**, **#5 Permissions + PDF-Listenreport**, **#8 Batch-Tagging/Kategorie**) umgesetzt.
