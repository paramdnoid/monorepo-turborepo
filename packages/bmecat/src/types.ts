export type BmecatParseIssue = { code: string; message: string };

export type BmecatArticleLine = {
  supplierSku: string;
  name: string | null;
  unit: string | null;
  price: string;
  currency: string;
  ean: string | null;
  groupKey: string | null;
};

export type BmecatParseResult = {
  articles: BmecatArticleLine[];
  errors: BmecatParseIssue[];
  warnings: BmecatParseIssue[];
};
