/** JSON aus Fetch-Text; bei ungueltigem Body `null`. */
export function parseResponseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
