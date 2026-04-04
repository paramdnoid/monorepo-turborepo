export type DatanormParseIssue = { code: string; message: string };

export type DatanormArticleLine = {
  supplierSku: string;
  name: string | null;
  unit: string | null;
  price: string;
  currency: string;
  ean: string | null;
  groupKey: string | null;
};

export type DatanormParseResult = {
  articles: DatanormArticleLine[];
  errors: DatanormParseIssue[];
  warnings: DatanormParseIssue[];
};
