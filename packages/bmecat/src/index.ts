/**
 * @repo/bmecat — MVP-Extraktion von Artikel/Preis aus BMEcat-XML (typisch fuer IDS-/Haendler-Katalogdateien).
 *
 * MVP: Dateiupload im Web; Live-Anbindung laeuft separat ueber die API (IDS-Connect-Adapter / Mock).
 */

export type {
  BmecatArticleLine,
  BmecatParseIssue,
  BmecatParseResult,
} from "./types.js";

export { parseBmecatXml } from "./parse-xml.js";
