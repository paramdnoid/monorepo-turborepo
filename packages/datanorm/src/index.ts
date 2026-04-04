/**
 * @repo/datanorm — MVP-Parser für Artikel-/Preislieferungen im DATANORM-üblichen W/P-Textformat (Datei oder ZIP).
 *
 * Produktscope (Web-Modul „Ressourcenmanagement & Großhandel“):
 * - MVP: Datei-Upload (ZIP oder .txt/.csv-ähnlich), keine IDS-Connect-Online-API.
 * - Vollständige Normabdeckung aller DATANORM-Versionen bewusst nicht Ziel dieser ersten Ausbaustufe.
 */

export type {
  DatanormArticleLine,
  DatanormParseIssue,
  DatanormParseResult,
} from "./types.js";

export { parseDatanormText } from "./parse-text.js";
export { parseDatanormBuffer } from "./parse-buffer.js";
