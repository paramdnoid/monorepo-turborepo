import type { GaebNormalizedNode } from "./types.js";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Minimal GAEB DA XML skeleton for round-trip export (supported subset).
 */
export function serializeDaXml(nodes: GaebNormalizedNode[]): string {
  const ns = "http://www.gaeb.de/GAEB_DA_XML/200406";
  const itemsXml = nodes
    .filter((n) => n.nodeType === "item")
    .map((n) => {
      const parts: string[] = ["          <Item>"];
      if (n.outlineNumber)
        parts.push(`            <RNoPart>${esc(n.outlineNumber)}</RNoPart>`);
      if (n.shortText)
        parts.push(
          `            <OutlineText>${esc(n.shortText)}</OutlineText>`,
        );
      if (n.quantity) parts.push(`            <Qty>${esc(n.quantity)}</Qty>`);
      if (n.unit) parts.push(`            <QU>${esc(n.unit)}</QU>`);
      if (n.longText)
        parts.push(`            <DetailTxt>${esc(n.longText)}</DetailTxt>`);
      parts.push("          </Item>");
      return parts.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<GAEB xmlns="${ns}">
  <Award>
    <BoQ>
      <BoQBody>
        <Itemlist>
${itemsXml}
        </Itemlist>
      </BoQBody>
    </BoQ>
  </Award>
</GAEB>
`;
}
