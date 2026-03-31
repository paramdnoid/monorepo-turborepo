export type FaqEntry = { question: string; answer: string };

export const faqsDe: FaqEntry[] = [
  {
    question: "Was ist ZunftGewerk und welche Bereiche deckt die Plattform ab?",
    answer:
      "ZunftGewerk ist eine integrierte Fachsoftware fuer Handwerksbetriebe: Sie buendelt typische Taetigkeiten von der Angebotserstellung und Disposition ueber die mobile Einsatzdokumentation bis zur Rechnungsstellung und Nachkalkulation in einem durchgaengigen Datenmodell.\n\n" +
      "Statt zwischen Kalender, Tabellenkalkulation, Branchenkatalog und Buchhaltung zu wechseln, arbeiten Buero, Aussendienst und Geschaeftsfuehrung auf denselben Stammdaten, Statusinformationen und Dokumenten. Aenderungen sind fuer berechtigte Rollen nachvollziehbar; wiederkehrende Ablaeufe lassen sich ueber Vorlagen und Standards beschleunigen.\n\n" +
      "Die Oberflaeche ist auf wiederkehrende Handwerks-Workflows ausgelegt: schnelle Erfassung unterwegs, klare Listen im Buero, nachvollziehbare Historien fuer Kunden und Auftraege. Branchenspezifische Funktionen (z. B. fuer Kaminfeger, Maler oder SHK) ergaenzen die gemeinsame Basis, damit Fachanforderungen nicht durch generische CRM-Logik ersetzt werden muessen.",
  },
  {
    question: "Fuer welche Betriebsgroessen und Organisationsformen eignet sich ZunftGewerk?",
    answer:
      "ZunftGewerk adressiert inhabergefuehrte Betriebe und wachsende Teams, die mehr als punktuelle Apps brauchen: typischerweise von kleinen Kernmannschaften bis zu mehreren festen Monteuren plus Verwaltung. Die Plaene unterscheiden sich vor allem nach Benutzeranzahl, Speicher und Schnittstellen - nicht nach einer starren Mitarbeiter-Obergrenze fuer die Nutzung im Feld.\n\n" +
      "Einzelunternehmen profitieren von klaren Standardablaeufen und geringem Einstieg; groessere Betriebe von parallelen Arbeitsstraengen, mehr Speicher fuer Fotos und Plaene sowie erweiterten Exporten in Buchhaltung und AVA. Franchisesysteme oder mehrere Niederlassungen sollten mit uns die Organisationsstruktur abstimmen, damit Mandanten- und Rechte-Konzepte zu Ihren Prozessen passen.\n\n" +
      "Wenn Sie unsicher sind, ob Ihre Prozesse (z. B. sehr spezielle Subunternehmer-Ketten oder aussergewoehnliche ERP-Pflichten) abgedeckt sind, ist ein kurzes Gespraech mit dem Vertrieb meist schneller als ein langes Feature-Listing.",
  },
  {
    question: "Wie laeuft die Testphase ab - und wann muss ich eine Zahlungsmethode hinterlegen?",
    answer:
      "Sie starten mit einer zeitlich begrenzten Testphase auf dem gewaehlten Tarif. In dieser Phase koennen Sie die fuer Ihren Plan vorgesehenen Funktionen ausprobieren, ohne dass bereits eine kostenpflichtige Abonnement-Phase beginnt. Ziel ist ein realistischer Alltagstest mit Ihren Daten und Workflows.\n\n" +
      "Fuer die spaetere Abrechnung wird im Onboarding ueblicherweise eine Zahlungsmethode bei unserem Zahlungsdienstleister Stripe hinterlegt. Die Belastung erfolgt erst nach Ablauf der Testphase und entsprechend der gewaehlten Abrechnungsperiode (z. B. monatlich oder jaehrlich), sofern Sie nicht fristgerecht kuendigen.\n\n" +
      "Rechnungen und Belege zu Zahlungen stellen wir elektronisch bereit; steuerliche Angaben entnehmen Sie bitte den jeweiligen Dokumenten und Ihrem Steuerberater. Aenderungen an Zahlungsmitteln koennen Sie im Kundenbereich vornehmen, soweit dort vorgesehen.",
  },
  {
    question: "Wie werden Datenschutz und DSGVO bei ZunftGewerk umgesetzt?",
    answer:
      "Wir verarbeiten personenbezogene Daten (z. B. Kunden-, Mitarbeiter- und Vertragsdaten) nur fuer nachvollziehbare Zwecke im Rahmen der angebotenen Leistung und der gesetzlichen Pflichten. Verarbeitungstaetigkeiten sind in der Datenschutzerklaerung beschrieben; ergaenzend koennen fuer betrieblich besonders sensible Konstellationen Auftragsverarbeitungsvereinbarungen (AVV) relevant sein.\n\n" +
      "Technisch setzen wir auf Hosting in Deutschland, Transportverschluesselung (TLS) sowie eine starke Verschluesselung fuer besonders sensible Inhalte in der Speicherung, wo dies vorgesehen ist. Zugriffe sind rollenbasiert; mitarbeitende sollten nur die Daten sehen, die sie fuer ihre Rolle benoetigen.\n\n" +
      "Sie unterliegen als Verantwortlicher weiterhin Ihren Informationspflichten gegenueber betroffenen Personen und Ihren eigenen Organisationstools (z. B. Aktenfuehrung). Bei konkreten Fragen zu Datenexport, Loeschung oder Incident-Response nutzen Sie bitte die in der Datenschutzerklaerung genannten Kontaktwege.",
  },
  {
    question: "Wie funktioniert Offline-Arbeit und Synchronisation in der Praxis?",
    answer:
      "Im Aussendienst ist die Verbindung nicht immer stabil. ZunftGewerk ist darauf ausgelegt, relevante Daten lokal zwischenzuspeichern, damit Sie Auftraege, Fotos, Messwerte oder Notizen auch ohne durchgaengiges Netz weiterbearbeiten koennen. Sobald wieder eine Verbindung besteht, werden Aenderungen mit der Cloud abgeglichen.\n\n" +
      "Bei gleichzeitigen Bearbeitungen gelten serverseitige Regeln zur Konfliktvermeidung: typischerweise gewinnt die zeitlich letzte konsistente Aenderung oder es wird eine nachvollziehbare Sicht auf den aktuellen Stand erzwungen. Details haengen vom Objekttyp ab (z. B. Stammdaten vs. Freitextnotizen).\n\n" +
      "Fuer grosse Medien (viele hochaufloesende Fotos) empfehlen sich WLAN-Phasen oder zeitversetztes Hochladen, damit Mobilfunkstrecken nicht zum Flaschenhals werden. Die Clients zeigen den Synchronisationsstatus transparent an, wo dies vorgesehen ist.",
  },
  {
    question: "Welche Gewerke werden unterstuetzt - und was ist fuer die Zukunft geplant?",
    answer:
      "Heute liefern wir vertiefte Funktionen und Inhalte fuer ausgewaehlte Gewerke: Kaminfeger, Maler und Tapezierer sowie Sanitaer-, Heizungs- und Klima-Technik (SHK). Dazu gehoeren branchenspezifische Stammdaten, typische Mess- und Dokumentationspfade sowie passende Schnittstellen- und Katalog-Anbindungen, soweit im jeweiligen Tarif enthalten.\n\n" +
      "Weitere Gewerke (z. B. Elektro, Schreinerei, Dachdecker) sind in Planung; Roadmap-Prioritaeten leiten wir aus Nachfrage, regulatorischen Anforderungen und technischer Machbarkeit ab. Vor einer grossen Umstellung in Ihrem Betrieb lohnt sich die Rueckfrage, ob Ihr Gewerk bereits im vollen Funktionsumfang abgedeckt ist.\n\n" +
      "Auch wenn ein Gewerk noch nicht in der Tiefe unterstuetzt wird, koennen generische Module (Auftragskorb, Termine, Dokumente) teilweise schon produktiv sein - das sollten Sie aber im Einzelfall mit uns validieren.",
  },
  {
    question: "Was unterscheidet die Plaene Starter und Professional im Detail?",
    answer:
      "Starter richtet sich an kleinere Teams mit begrenzter Parallelitaet: weniger gleichzeitige Benutzer, weniger Speicher fuer Dokumente und Medien, aber vollstaendiger Zugang zu den Kernfunktionen des Plans inklusive mobiler und Desktop-Clients. Professional skaliert Benutzer- und Speicherkapazitaeten nach oben und erweitert den Funktionsumfang um Schnittstellen, die wachsende Betriebe typischerweise brauchen.\n\n" +
      "Im Professional-Tarif finden sich je nach Produktstand u. a. erweiterte Exporte in Richtung DATEV und GAEB sowie mehr Spielraum fuer Katalog- und Grosshaendler-Anbindungen. Nicht jedes Gewerk benoetigt alle Schnittstellen gleichzeitig - waehlen Sie den Plan nach Ihrem realen jaehrlichen Schnittstellenbedarf.\n\n" +
      "Ein Upgrade ist moeglich, wenn Ihre Organisation waechst; Downgrades sind nach den vertraglichen Kuendigungs- und Laufzeitregeln moeglich. Die genauen Leistungsmerkmale entnehmen Sie bitte der aktuellen Preis- und Leistungsuebersicht auf der Website.",
  },
  {
    question: "Welche Clients gibt es - Web, mobil und Desktop?",
    answer:
      "Fuer den Bueroalltag stehen Desktop-Anwendungen fuer gaengige Betriebssysteme (Windows, macOS, Linux) zur Verfuegung, die tief in Dateisystem, Druckern und Mehrmonitor-Setups integrieren. Fuer den Aussendienst gibt es native mobile Apps fuer iOS und Android, optimiert fuer Touch, Kamera und GPS-Kontext.\n\n" +
      "Die Web-Oberflaeche ergaenzt dort, wo keine Installation gewuenscht ist oder schneller Zugriff aus dem Browser reicht. Alle Clients synchronisieren ueber dieselbe Cloud-Instanz; welche Funktion exakt wo verfuegbar ist, kann je nach Release leicht variieren.\n\n" +
      "Installationen aus Unternehmens-App-Stores oder Device-Management-Umgebungen sollten mit Ihrer IT abgestimmt werden (Zertifikate, VPN, Updatefenster). Bei eingeschraenkten Endgeraeten helfen Browser- oder Terminal-Server-Szenarien, sofern von Ihrer Policy erlaubt.",
  },
  {
    question: "Wie werden Zahlungen und Abonnements technisch abgewickelt?",
    answer:
      "Zahlungen und wiederkehrende Abonnements werden ueber Stripe abgewickelt, einen etablierten Zahlungsdienstleister mit starkem Fokus auf Kartenzahlungen und Compliance-Features. ZunftGewerk speichert keine vollstaendigen Kartendaten in eigener Datenbank; stattdessen arbeiten wir mit Token- und Mandanten-Modellen seitens Stripe.\n\n" +
      "Die Abrechnung folgt der gewaehlten Periode; bei jaehrlicher Zahlweise gelten die auf der Website ausgewiesenen Effektivkonditionen. Steuerliche Ausweise auf Rechnungen richten sich nach Ihrem Standort und Rechtsform - pruefen Sie Ausweise mit Ihrer Buchhaltung.\n\n" +
      "Bei Zahlungsausfaellen (abgelaufene Karte, Limit) informieren Sie Stripe bzw. unsere Prozesse typischerweise per E-Mail; ein rechtzeitiges Update der Zahlungsmethode verhindert Unterbrechungen des Dienstes.",
  },
  {
    question: "Wie kuendige ich - und wie erhalte ich meine Daten zurueck?",
    answer:
      "Sie koennen das Abonnement zu den in den AGB beschriebenen Fristen und Zyklen kuendigen; ein laufender Zeitraum wird in der Regel noch zu Ende gefuehrt, sofern nichts anderes vereinbart ist. Nach Vertragsende werden Cloud-Dienste entsprechend der vertraglichen Regelungen eingeschraenkt oder beendet.\n\n" +
      "Fuer die Nachnutzung Ihrer Daten stellen wir Exporte oder Uebergabeformate bereit, soweit technisch und vertraglich vorgesehen. Umfang und Format haengen vom Objekttyp ab (Stammdaten, Dokumente, Buchungs-relevante Summen). Planen Sie Migrationen fruehzeitig, insbesondere wenn Sie parallel eine neue Software einfuehren.\n\n" +
      "Aufbewahrungsfristen aus Handels- und Steuerrecht bleiben Ihre Verantwortung; loeschen Sie Daten in ZunftGewerk nur, wenn keine gesetzlichen Aufbewahrungspflichten mehr entgegenstehen. Details finden Sie in AGB und Datenschutzerklaerung.",
  },
  {
    question: "Wie erreiche ich Support - und was kann ich erwarten?",
    answer:
      "Der primaere Kanal ist E-Mail an support@zunftgewerk.de. Nutzen Sie eine Betreffzeile mit Kurzbeschreibung und Ihre Organisationskennung, falls vorhanden, damit Anfragen schneller zugeordnet werden. Bei produktionskritischen Stoerungen beschreiben Sie bitte Zeitpunkt, betroffene Benutzer und Screenshots oder Fehlermeldungen.\n\n" +
      "Antwortzeiten haengen von Prioritaet und Volumen ab; werktags sind typische Produktfragen in der Regel innerhalb weniger Arbeitstage bearbeitet. Rechtsverbindliche oder individuell vertraglich zugesicherte SLAs gelten nur, wenn sie ausdruecklich vereinbart sind.\n\n" +
      "Fuer Schulungen, Datenmigrationen oder Customizing wenden Sie sich an Vertrieb oder Professional Services, sofern angeboten. Anwenderfehler vs. Produktdefekte werden wir transparent benennen, damit Sie nicht in einer Support-Schleife haengen bleiben.",
  },
  {
    question: "Welche Schnittstellen und Standards werden unterstuetzt?",
    answer:
      "Je nach Gewerk und Tarif unterstuetzen wir u. a. GAEB-Import und -Export fuer Ausschreibungen und Leistungsverzeichnisse, DATEV-Exporte fuer die Uebergabe an die Buchhaltung sowie Katalog-Schnittstellen zu Grosshaendlern (z. B. IDS, OCI, DATANORM), soweit verfuegbar und lizenziert.\n\n" +
      "Nicht jede Kombination aus Katalog, Einkaufskondition und Steuerlogik ist automatisiert abdeckbar; manche Szenarien erfordern manuelle Nachbearbeitung oder Zusatztools. Wir erweitern Schnittstellen iterativ nach betrieblichem Nutzen und technischer Stabilitaet.\n\n" +
      "Wenn Sie eine spezielle Branchensoftware ersetzen, vergleichen Sie die kritischen Exporte (Debitoren, Anlagen, offene Posten) fruehzeitig mit Ihrem Steuerberater, um Jahreswechsel sauber zu halten.",
  },
  {
    question: "Wo liegen Daten - und wie sind Schutz, Backups und Verfuegbarkeit organisiert?",
    answer:
      "Produktivdaten werden in Deutschland in Rechenzentren mit branchenueblichen Zertifizierungen gehostet; Netzwerkzugriffe erfolgen verschluesselt. Ruhende Daten werden mit starken Verfahren geschuetzt, wo fuer die jeweiligen Datenklassen vorgesehen.\n\n" +
      "Backups und Disaster-Recovery-Prozesse sind betrieblich implementiert; Recovery Point und Recovery Time Objectives richten sich nach internen Richtlinien und werden kontinuierlich verbessert. Dennoch ist keine Cloud zu 100% ausfallsicher - planen Sie kritische Exporte zusaetzlich lokal oder beim Steuerberater.\n\n" +
      "Wartungsfenster koennen kurzfristige Einschraenkungen bringen; wir informieren, soweit moeglich und sinnvoll, ueber groessere Aenderungen. Statusseiten oder proaktive Mails werden genutzt, wenn verfuegbar.",
  },
  {
    question: "Gibt es Rollen, Berechtigungen und Mandantenfaehigkeit?",
    answer:
      "Organisationen arbeiten in einem gemeinsamen Mandanten mit Benutzern und Rollen, die steuern, wer Stammdaten, Finanzen oder personenbezogene Daten sieht und bearbeitet. Das reduziert Fehlbedienung und erleichtert Nachweise im Audit.\n\n" +
      "Mehrere rechtlich getrennte Unternehmen in einer Installation sind nicht immer trivial - pruefen Sie mit uns, ob Ihre Holdingstruktur abgebildet werden kann oder separate Organisationen noetig sind.\n\n" +
      "Integrationen mit Identity-Providern (SSO) oder erweiterten Sicherheitsrichtlinien sind je nach Roadmap und Vertrag moeglich; Enterprise-Szenarien sollten frueh adressiert werden.",
  },
  {
    question: "Gibt es eine oeffentliche API, Automatisierung oder Zapier?",
    answer:
      "Der Schwerpunkt liegt auf stabilen Fach-Workflows und geprueften Schnittstellen zu Buchhaltung und Einkauf. Eine breit dokumentierte Public-REST-API fuer beliebige Automatisierungen ist nicht in jedem Release identisch verfuegbar; wenn Automatisierung fuer Sie kritisch ist, klaeren wir den Stand im Projekt.\n\n" +
      "Typische Integrationsmuster sind Batch-Exporte, CSV/GAEB/DATEV oder Webhooks dort, wo unterstuetzt. Low-Code-Tools (Zapier, Make) sind nur sinnvoll, wenn passende Endpunkte und Authentifizierung existieren.\n\n" +
      "Fuer individuelle Schnittstellen zu ERP-Systemen bieten sich Partner- oder Custom-Projekte an - sprechen Sie uns mit Lastenheft und Datenmodell an.",
  },
  {
    question: "Welche Sprachen, Barrierefreiheit und Hilfen gibt es?",
    answer:
      "Die Oberflaeche ist mindestens auf Deutsch und Englisch nutzbar; weitere Sprachen koennen je nach Release ergaenzt werden. Inhalte, die Sie selbst pflegen (Texte auf Angeboten, E-Mails an Kunden), bleiben in Ihrer Verantwortung.\n\n" +
      "Barrierefreiheit ist ein fortlaufendes Thema: Wir nutzen etablierte UI-Bibliotheken und verbessern Kontraste, Fokusreihenfolgen und Screenreader-Hinweise iterativ. Vollstaendige Konformitaet mit jeder WCAG-Stufe fuer jede Ansicht kann nicht immer sofort zugesichert werden.\n\n" +
      "Tastaturbedienung und Zoom sind grundsaetzlich vorgesehen; wenn Sie konkrete Barrieren finden, melden Sie diese mit Browser-Version und Schrittfolge, damit wir sie priorisieren koennen.",
  },
];

export const faqsEn: FaqEntry[] = [
  {
    question: "What is ZunftGewerk and which areas does the platform cover?",
    answer:
      "ZunftGewerk is integrated trade software for craft businesses: it brings together typical work from quoting and dispatch through mobile job documentation to invoicing and post-calculation in one coherent data model.\n\n" +
      "Instead of jumping between calendar, spreadsheets, trade catalog, and accounting, office, field, and management work on the same master data, status information, and documents. Changes are traceable for authorized roles; recurring flows can be accelerated with templates and standards.\n\n" +
      "The UI is tuned to recurring trade workflows: fast capture on site, clear lists in the office, traceable histories for customers and jobs. Trade-specific features (e.g. chimney sweeps, painters, or HVAC) extend the shared baseline so specialist needs are not replaced by generic CRM logic.",
  },
  {
    question: "Which company sizes and organizational models is ZunftGewerk suited for?",
    answer:
      "ZunftGewerk targets owner-led businesses and growing teams that need more than point tools: typically from small core crews to several permanent installers plus back office. Plans differ mainly by user count, storage, and interfaces—not by a rigid cap that blocks field usage.\n\n" +
      "Sole traders benefit from clear defaults and a low-friction start; larger shops benefit from parallel workstreams, more storage for photos and plans, and extended exports to accounting and AVA. Franchise or multi-branch setups should align org structure with us so tenant and permission models fit your processes.\n\n" +
      "If you are unsure whether unusual subcontract chains or heavy ERP duties are covered, a short sales conversation is usually faster than a long feature checklist.",
  },
  {
    question: "How does the trial work—and when must I add a payment method?",
    answer:
      "You start with a time-limited trial on the selected tier. During the trial you can exercise the features included in that plan without entering a paid subscription period yet. The goal is a realistic day-to-day test with your data and workflows.\n\n" +
      "For later billing, onboarding typically collects a payment method with our payment processor Stripe. Charges start after the trial ends according to the chosen billing cadence (e.g. monthly or yearly), unless you cancel in time.\n\n" +
      "Invoices and payment documents are provided electronically; tax positions should be validated with your accountant. Payment method changes are available in the customer area where provided.",
  },
  {
    question: "How are privacy and GDPR implemented?",
    answer:
      "We process personal data (e.g. customer, staff, and contract data) only for traceable purposes tied to the service and legal duties. Processing is described in the privacy policy; data processing agreements (DPAs) may apply for sensitive operational setups.\n\n" +
      "Technically we rely on hosting in Germany, transport encryption (TLS), and strong encryption for particularly sensitive stored content where designed. Access is role-based; staff should only see data required for their role.\n\n" +
      "You remain responsible as controller for informing data subjects and for your own record-keeping tools. For export, erasure, or incident questions use the contacts listed in the privacy policy.",
  },
  {
    question: "How do offline work and synchronization behave in practice?",
    answer:
      "Field connectivity is not always stable. ZunftGewerk caches relevant data locally so you can keep working on jobs, photos, readings, or notes without a continuous network. When connectivity returns, changes reconcile with the cloud.\n\n" +
      "Concurrent edits follow server-side rules: typically last consistent write wins or a clear view of the current state is enforced. Details depend on object type (master data vs free-text notes).\n\n" +
      "Large media batches benefit from Wi‑Fi phases or deferred upload so mobile uplink is not the bottleneck. Clients surface sync status where implemented.",
  },
  {
    question: "Which trades are supported—and what is on the roadmap?",
    answer:
      "Today we deliver deeper features for selected trades: chimney sweeps, painters and decorators, and plumbing/HVAC (SHK). That includes trade-specific master data, typical measurement and documentation paths, and catalog or interface hooks where included in the tier.\n\n" +
      "More trades (e.g. electrical, carpentry, roofing) are planned; roadmap priorities follow demand, regulation, and feasibility. Before a major change in your shop, confirm whether your trade is fully covered.\n\n" +
      "Even if a trade is not deeply supported yet, generic modules (jobs, appointments, documents) may already help—validate case by case with us.",
  },
  {
    question: "How do Starter and Professional differ in detail?",
    answer:
      "Starter fits smaller teams with limited parallelism: fewer concurrent users, less storage for documents and media, but full access to core features of the tier including mobile and desktop clients. Professional scales users and storage and expands capabilities with interfaces growing businesses typically need.\n\n" +
      "Professional may include broader exports toward DATEV and GAEB plus more headroom for catalog and wholesale integrations—not every trade needs every interface at once. Choose based on real annual interface workload.\n\n" +
      "Upgrades are possible as you grow; downgrades follow contractual terms and billing cycles. See the current pricing page for exact entitlements.",
  },
  {
    question: "Which clients exist—web, mobile, and desktop?",
    answer:
      "Desktop apps are available for common OSes (Windows, macOS, Linux) with deeper OS integration for files, printers, and multi-monitor setups. Native mobile apps for iOS and Android target touch, camera, and GPS context.\n\n" +
      "The web UI complements scenarios where no install is desired or quick browser access suffices. All clients sync via the same cloud; exact feature parity per client can vary by release.\n\n" +
      "Corporate app stores or MDM deployments should be coordinated with IT (certificates, VPN, update windows). Restricted devices may use browser or terminal-server setups if policy allows.",
  },
  {
    question: "How are payments and subscriptions handled technically?",
    answer:
      "Payments and recurring subscriptions run through Stripe, an established processor focused on cards and compliance. ZunftGewerk does not store full card PANs in our database; we rely on Stripe tokenization models.\n\n" +
      "Billing follows the selected period; yearly plans reflect the effective rates shown on the site. Tax lines depend on your location and legal form—validate with finance.\n\n" +
      "Failed charges (expired card, limits) are usually communicated by email; updating the payment method early avoids service interruption.",
  },
  {
    question: "How do I cancel—and how do I get my data back?",
    answer:
      "You can cancel the subscription per the terms and notice windows in the Terms; an active period typically runs to completion unless agreed otherwise. After termination, cloud services are restricted or ended per contract.\n\n" +
      "For continued use of your data we provide exports or handover formats where technically and contractually foreseen. Scope and format depend on object types (master data, documents, accounting-relevant totals). Plan migrations early, especially when introducing new software.\n\n" +
      "Commercial and tax retention rules remain your responsibility; delete data in ZunftGewerk only when no legal holds apply. See Terms and privacy policy for details.",
  },
  {
    question: "How do I reach support—and what should I expect?",
    answer:
      "Primary channel is email to support@zunftgewerk.de. Use a concise subject and organization identifier if available. For outages include time, affected users, and screenshots or error text.\n\n" +
      "Response times depend on priority and volume; typical product questions are usually handled within a few business days. Legally binding or custom SLAs apply only if explicitly contracted.\n\n" +
      "Training, migration, or customization may route to sales or professional services when offered. We will separate user error from defects transparently so you are not stuck in loops.",
  },
  {
    question: "Which interfaces and standards are supported?",
    answer:
      "Depending on trade and tier we support GAEB import/export for tenders and bills of quantities, DATEV exports for accounting, and wholesale catalog interfaces (e.g. IDS, OCI, DATANORM) where available and licensed.\n\n" +
      "Not every combination of catalog, purchasing terms, and tax logic is fully automated; some scenarios need manual follow-up or extra tools. We expand interfaces iteratively for stability and ROI.\n\n" +
      "If you replace legacy software, validate critical exports (debtors, assets, open items) early with your accountant for clean year-end cuts.",
  },
  {
    question: "Where is data stored—and how are protection, backups, and availability handled?",
    answer:
      "Production data is hosted in Germany in facilities with common certifications; network access is encrypted. Data at rest uses strong protection where designed for each class.\n\n" +
      "Backups and disaster recovery are operational; RPO/RTO targets follow internal policy and improve over time. No cloud is 100% immune—plan critical exports additionally on-prem or with your accountant.\n\n" +
      "Maintenance windows may cause short constraints; we communicate larger changes when sensible. Status pages or proactive mail may be used when available.",
  },
  {
    question: "Are there roles, permissions, and multi-tenant capabilities?",
    answer:
      "Organizations work in a shared tenant with users and roles controlling who can view or edit master data, finance, or personal data. That reduces misuse and aids audits.\n\n" +
      "Multiple legally separate companies in one installation is not always trivial—confirm with us whether your holding structure fits or separate orgs are needed.\n\n" +
      "Identity-provider (SSO) integrations or advanced security policies may be available depending on roadmap and contract; enterprise scenarios should be raised early.",
  },
  {
    question: "Is there a public API, automation, or Zapier?",
    answer:
      "The focus is on stable trade workflows and vetted accounting and purchasing interfaces. A broadly documented public REST API for arbitrary automation may not be identical in every release—ask us if automation is critical.\n\n" +
      "Typical patterns are batch exports, CSV/GAEB/DATEV, or webhooks where supported. Low-code tools only help when endpoints and authentication exist.\n\n" +
      "Custom ERP integrations may need partner or bespoke projects—reach out with requirements and data model.",
  },
  {
    question: "What languages, accessibility, and assistance are available?",
    answer:
      "The UI is available at least in German and English; more locales may arrive per release. Content you author (quotes, customer emails) remains your responsibility.\n\n" +
      "Accessibility is ongoing: we use established UI libraries and iteratively improve contrast, focus order, and screen reader cues. Full WCAG conformance for every view cannot always be promised immediately.\n\n" +
      "Keyboard use and zoom are generally supported; report specific barriers with browser version and steps so we can prioritize.",
  },
];
