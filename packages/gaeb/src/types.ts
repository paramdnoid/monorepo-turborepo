export type GaebDetectedFormat = "da_xml" | "x83_hint" | "unknown";

export type GaebNormalizedNode = {
  sortIndex: number;
  nodeType: "section" | "item";
  outlineNumber: string | null;
  shortText: string | null;
  longText: string | null;
  quantity: string | null;
  unit: string | null;
};

export type GaebParseIssue = {
  code: string;
  message: string;
};

export type GaebParseResult = {
  format: GaebDetectedFormat;
  nodes: GaebNormalizedNode[];
  errors: GaebParseIssue[];
  warnings: GaebParseIssue[];
};
