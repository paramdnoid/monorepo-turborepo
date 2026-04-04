export type ColorSystemId = "ral" | "ncs";

export type RalClassicEntry = {
  code: string;
  hex: string;
};

export type NcsEntry = {
  notation: string;
  hex: string;
};

export type StoredColorRef = {
  system: ColorSystemId;
  id: string;
};
