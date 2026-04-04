export type UnderlayType =
  | "plaster"
  | "concrete"
  | "drywall"
  | "wood"
  | "metal"
  | "old-paint"
  | "other";

export type Moisture = "dry" | "slightly-damp" | "damp";
export type LoadBearing = "good" | "medium" | "poor";
export type Absorbency = "low" | "normal" | "high";
export type Contamination = "low" | "medium" | "high";

export type SubstrateInspectionState = {
  underlayType: UnderlayType;
  underlayOther: string;
  moisture: Moisture;
  loadBearing: LoadBearing;
  absorbency: Absorbency;
  contamination: Contamination;
  cracks: boolean;
  flaking: boolean;
  mold: boolean;
  salts: boolean;
  testNotes: string;
};

export type RiskLevel = "green" | "yellow" | "red";

export function computeSubstrateRisk(model: SubstrateInspectionState): {
  level: RiskLevel;
  reasons: string[];
  recommendations: string[];
} {
  const reasons: string[] = [];
  const rec: string[] = [];

  if (model.moisture === "damp") {
    reasons.push("Feuchte: feucht");
    rec.push("Feuchtemessung durchführen und Untergrund trocknen lassen.");
  } else if (model.moisture === "slightly-damp") {
    reasons.push("Feuchte: leicht feucht");
    rec.push("Feuchtemessung/Prüfung vor Beschichtung (ggf. Trocknung abwarten).");
  }

  if (model.mold) {
    reasons.push("Schimmelbefall");
    rec.push("Schimmel fachgerecht entfernen; Ursachenanalyse (Lüftung/Leckage).");
  }

  if (model.salts) {
    reasons.push("Salzausblühungen");
    rec.push("Ausblühungen entfernen; Ursache klären; geeigneten Systemaufbau wählen.");
  }

  if (model.loadBearing === "poor") {
    reasons.push("Tragfähigkeit: schlecht");
    rec.push("Lose Schichten entfernen; Haftzug prüfen; geeignete Grundierung einsetzen.");
  } else if (model.loadBearing === "medium") {
    reasons.push("Tragfähigkeit: mittel");
    rec.push("Haftung prüfen (Klebeband-/Gitterschnitt); ggf. Grundierung/Haftvermittler.");
  }

  if (model.flaking) {
    reasons.push("Abplatzungen/Schollenbildung");
    rec.push("Abplatzungen vollständig entfernen und Untergrund egalisieren.");
  }

  if (model.cracks) {
    reasons.push("Risse");
    rec.push("Risse beurteilen (statisch/dynamisch) und passend spachteln/armieren.");
  }

  if (model.contamination === "high") {
    reasons.push("Verschmutzung: hoch");
    rec.push("Untergrund reinigen/entfetten; ggf. nikotin-/rußisolierende Grundierung.");
  } else if (model.contamination === "medium") {
    reasons.push("Verschmutzung: mittel");
    rec.push("Untergrund reinigen; Saug-/Haftprüfung durchführen.");
  }

  if (model.absorbency === "high") {
    reasons.push("Saugfähigkeit: hoch");
    rec.push("Tiefgrund/Grundierung zur Saugfähigkeitsregulierung einplanen.");
  } else if (model.absorbency === "low") {
    reasons.push("Saugfähigkeit: gering");
    rec.push("Anschliff/Haftgrund/Haftvermittler prüfen (je nach System).");
  }

  const level: RiskLevel =
    model.mold ||
    model.moisture === "damp" ||
    model.loadBearing === "poor" ||
    model.flaking
      ? "red"
      : model.moisture === "slightly-damp" ||
          model.loadBearing === "medium" ||
          model.contamination === "high" ||
          model.absorbency === "high" ||
          model.salts ||
          model.cracks
        ? "yellow"
        : "green";

  return {
    level,
    reasons: [...new Set(reasons)],
    recommendations: [...new Set(rec)],
  };
}
