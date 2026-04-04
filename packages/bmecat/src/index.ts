/**
 * @repo/bmecat — MVP-Extraktion von Artikel/Preis aus BMEcat-XML (typisch fuer IDS-/Haendler-Katalogdateien).
 *
 * MVP: Dateiupload im Web; keine Live-Anbindung IDS-Connect-API.
 */

export type {
  BmecatArticleLine,
  BmecatParseIssue,
  BmecatParseResult,
} from "./types.js";

export { parseBmecatXml } from "./parse-xml.js";
