export interface ClassRelation {
  classId: number;
  relatedClasses: number[];
  reason: string;
  riskLevel: "high" | "medium" | "low";
}

export const RELATED_CLASSES_MAP: Record<number, ClassRelation> = {
  1: {
    classId: 1,
    relatedClasses: [2, 3, 4, 5],
    reason: "Chemische Erzeugnisse überschneiden sich mit Farben (2), Kosmetik (3), Ölen (4) und Pharmazeutika (5)",
    riskLevel: "medium",
  },
  2: {
    classId: 2,
    relatedClasses: [1, 3, 17, 19],
    reason: "Farben und Lacke überschneiden sich mit Chemie (1), Kosmetik (3), Dichtmaterial (17) und Baumaterial (19)",
    riskLevel: "medium",
  },
  3: {
    classId: 3,
    relatedClasses: [1, 2, 5, 21],
    reason: "Kosmetika überschneiden sich mit Chemie (1), Farben (2), Pharmazeutika (5) und Haushaltswaren (21)",
    riskLevel: "high",
  },
  4: {
    classId: 4,
    relatedClasses: [1, 7, 12],
    reason: "Öle und Schmiermittel überschneiden sich mit Chemie (1), Maschinen (7) und Fahrzeugen (12)",
    riskLevel: "medium",
  },
  5: {
    classId: 5,
    relatedClasses: [1, 3, 10, 29, 30, 32],
    reason: "Pharmazeutika überschneiden sich mit Chemie (1), Kosmetik (3), Medizingeräten (10) und Nahrungsmitteln (29, 30, 32)",
    riskLevel: "high",
  },
  6: {
    classId: 6,
    relatedClasses: [7, 11, 12, 19, 20],
    reason: "Metalle überschneiden sich mit Maschinen (7), Heizung (11), Fahrzeugen (12), Baumaterial (19) und Möbeln (20)",
    riskLevel: "high",
  },
  7: {
    classId: 7,
    relatedClasses: [6, 8, 9, 11, 12],
    reason: "Maschinen überschneiden sich mit Metallen (6), Werkzeugen (8), Elektronik (9), Heizung (11) und Fahrzeugen (12)",
    riskLevel: "high",
  },
  8: {
    classId: 8,
    relatedClasses: [6, 7, 21],
    reason: "Werkzeuge überschneiden sich mit Metallen (6), Maschinen (7) und Haushaltswaren (21)",
    riskLevel: "medium",
  },
  9: {
    classId: 9,
    relatedClasses: [7, 10, 11, 14, 28, 35, 38, 41, 42],
    reason: "Elektronik/Computer überschneiden sich mit Maschinen (7), Medizingeräten (10), Software-Diensten (35, 38, 41, 42)",
    riskLevel: "high",
  },
  10: {
    classId: 10,
    relatedClasses: [5, 9, 44],
    reason: "Medizingeräte überschneiden sich mit Pharmazeutika (5), Elektronik (9) und Medizindienstleistungen (44)",
    riskLevel: "high",
  },
  11: {
    classId: 11,
    relatedClasses: [6, 7, 9, 21],
    reason: "Heizung/Beleuchtung überschneidet sich mit Metallen (6), Maschinen (7), Elektronik (9) und Haushaltswaren (21)",
    riskLevel: "medium",
  },
  12: {
    classId: 12,
    relatedClasses: [4, 6, 7, 9, 37, 39],
    reason: "Fahrzeuge überschneiden sich mit Ölen (4), Metallen (6), Maschinen (7), Elektronik (9), Reparatur (37) und Transport (39)",
    riskLevel: "high",
  },
  13: {
    classId: 13,
    relatedClasses: [28],
    reason: "Schusswaffen überschneiden sich mit Spielzeug/Sport (28) bei Nachbildungen",
    riskLevel: "low",
  },
  14: {
    classId: 14,
    relatedClasses: [9, 25, 26],
    reason: "Schmuck überschneidet sich mit Elektronik/Smartwatches (9), Bekleidung (25) und Accessoires (26)",
    riskLevel: "medium",
  },
  15: {
    classId: 15,
    relatedClasses: [9, 28, 41],
    reason: "Musikinstrumente überschneiden sich mit Audio-Elektronik (9), Spielzeug (28) und Entertainment (41)",
    riskLevel: "medium",
  },
  16: {
    classId: 16,
    relatedClasses: [9, 35, 41],
    reason: "Papier/Bürobedarf überschneidet sich mit Elektronik (9), Werbung (35) und Verlagswesen (41)",
    riskLevel: "medium",
  },
  17: {
    classId: 17,
    relatedClasses: [1, 2, 6, 19],
    reason: "Dichtmaterial überschneidet sich mit Chemie (1), Farben (2), Metallen (6) und Baumaterial (19)",
    riskLevel: "medium",
  },
  18: {
    classId: 18,
    relatedClasses: [14, 25, 26],
    reason: "Leder/Taschen überschneidet sich mit Schmuck (14), Bekleidung (25) und Accessoires (26)",
    riskLevel: "high",
  },
  19: {
    classId: 19,
    relatedClasses: [6, 17, 20, 37],
    reason: "Baumaterialien überschneiden sich mit Metallen (6), Dichtmaterial (17), Möbeln (20) und Bauarbeiten (37)",
    riskLevel: "high",
  },
  20: {
    classId: 20,
    relatedClasses: [6, 11, 19, 21, 24],
    reason: "Möbel überschneiden sich mit Metallen (6), Beleuchtung (11), Baumaterial (19), Haushaltswaren (21) und Textilien (24)",
    riskLevel: "medium",
  },
  21: {
    classId: 21,
    relatedClasses: [3, 8, 11, 20],
    reason: "Haushaltswaren überschneiden sich mit Kosmetik (3), Werkzeugen (8), Beleuchtung (11) und Möbeln (20)",
    riskLevel: "medium",
  },
  22: {
    classId: 22,
    relatedClasses: [17, 24],
    reason: "Seile/Planen überschneiden sich mit Dichtmaterial (17) und Textilien (24)",
    riskLevel: "low",
  },
  23: {
    classId: 23,
    relatedClasses: [24, 25, 26],
    reason: "Garne überschneiden sich mit Textilien (24), Bekleidung (25) und Kurzwaren (26)",
    riskLevel: "medium",
  },
  24: {
    classId: 24,
    relatedClasses: [20, 22, 23, 25],
    reason: "Textilien überschneiden sich mit Möbeln (20), Seilen (22), Garnen (23) und Bekleidung (25)",
    riskLevel: "medium",
  },
  25: {
    classId: 25,
    relatedClasses: [14, 18, 23, 24, 26],
    reason: "Bekleidung überschneidet sich mit Schmuck (14), Leder (18), Garnen (23), Textilien (24) und Accessoires (26)",
    riskLevel: "high",
  },
  26: {
    classId: 26,
    relatedClasses: [14, 18, 23, 25],
    reason: "Kurzwaren/Accessoires überschneiden sich mit Schmuck (14), Leder (18), Garnen (23) und Bekleidung (25)",
    riskLevel: "high",
  },
  27: {
    classId: 27,
    relatedClasses: [19, 20, 24],
    reason: "Teppiche überschneiden sich mit Baumaterial (19), Möbeln (20) und Textilien (24)",
    riskLevel: "medium",
  },
  28: {
    classId: 28,
    relatedClasses: [9, 15, 41],
    reason: "Spielzeug/Sport überschneidet sich mit Elektronik (9), Musikinstrumenten (15) und Entertainment (41)",
    riskLevel: "medium",
  },
  29: {
    classId: 29,
    relatedClasses: [5, 30, 31, 32, 43],
    reason: "Fleisch/Milch überschneidet sich mit Pharma (5), Backwaren (30), Pflanzen (31), Getränken (32) und Gastronomie (43)",
    riskLevel: "high",
  },
  30: {
    classId: 30,
    relatedClasses: [5, 29, 31, 32, 43],
    reason: "Backwaren/Gewürze überschneiden sich mit Pharma (5), Fleisch (29), Pflanzen (31), Getränken (32) und Gastronomie (43)",
    riskLevel: "high",
  },
  31: {
    classId: 31,
    relatedClasses: [29, 30, 44],
    reason: "Pflanzen/Tierfutter überschneiden sich mit Nahrung (29, 30) und Landwirtschaft (44)",
    riskLevel: "medium",
  },
  32: {
    classId: 32,
    relatedClasses: [5, 29, 30, 33, 43],
    reason: "Alkoholfreie Getränke überschneiden sich mit Pharma (5), Nahrung (29, 30), Alkohol (33) und Gastronomie (43)",
    riskLevel: "high",
  },
  33: {
    classId: 33,
    relatedClasses: [32, 43],
    reason: "Alkoholische Getränke überschneiden sich mit alkoholfreien Getränken (32) und Gastronomie (43)",
    riskLevel: "high",
  },
  34: {
    classId: 34,
    relatedClasses: [],
    reason: "Tabakwaren haben wenige Überschneidungen mit anderen Klassen",
    riskLevel: "low",
  },
  35: {
    classId: 35,
    relatedClasses: [9, 36, 38, 41, 42],
    reason: "Werbung/Geschäftsführung überschneidet sich mit Elektronik (9), Finanzen (36), Telekommunikation (38), Entertainment (41) und IT (42)",
    riskLevel: "high",
  },
  36: {
    classId: 36,
    relatedClasses: [35, 37],
    reason: "Finanzdienstleistungen überschneiden sich mit Geschäftsführung (35) und Immobilien (37)",
    riskLevel: "medium",
  },
  37: {
    classId: 37,
    relatedClasses: [12, 19, 36, 40],
    reason: "Bau/Reparatur überschneidet sich mit Fahrzeugen (12), Baumaterial (19), Immobilien (36) und Fertigung (40)",
    riskLevel: "medium",
  },
  38: {
    classId: 38,
    relatedClasses: [9, 35, 41, 42],
    reason: "Telekommunikation überschneidet sich mit Elektronik (9), Werbung (35), Entertainment (41) und IT (42)",
    riskLevel: "high",
  },
  39: {
    classId: 39,
    relatedClasses: [12, 43],
    reason: "Transport/Reisen überschneidet sich mit Fahrzeugen (12) und Gastronomie (43)",
    riskLevel: "medium",
  },
  40: {
    classId: 40,
    relatedClasses: [7, 37, 42],
    reason: "Materialbearbeitung überschneidet sich mit Maschinen (7), Bau (37) und IT (42)",
    riskLevel: "medium",
  },
  41: {
    classId: 41,
    relatedClasses: [9, 15, 16, 28, 35, 38, 42, 43],
    reason: "Entertainment/Bildung überschneidet sich mit vielen Dienstleistungen: Elektronik, Musik, Verlag, Sport, Werbung, Telekom, IT, Gastronomie",
    riskLevel: "high",
  },
  42: {
    classId: 42,
    relatedClasses: [9, 35, 38, 40, 41, 44, 45],
    reason: "IT/Wissenschaft überschneidet sich mit Elektronik (9), Geschäft (35), Telekom (38), Fertigung (40), Entertainment (41), Medizin (44) und Recht (45)",
    riskLevel: "high",
  },
  43: {
    classId: 43,
    relatedClasses: [29, 30, 32, 33, 39, 41],
    reason: "Gastronomie überschneidet sich mit Nahrung (29, 30), Getränken (32, 33), Transport (39) und Entertainment (41)",
    riskLevel: "high",
  },
  44: {
    classId: 44,
    relatedClasses: [5, 10, 31, 42],
    reason: "Medizin/Landwirtschaft überschneidet sich mit Pharma (5), Medizingeräten (10), Pflanzen (31) und Wissenschaft (42)",
    riskLevel: "high",
  },
  45: {
    classId: 45,
    relatedClasses: [35, 36, 42],
    reason: "Rechtsdienstleistungen überschneiden sich mit Geschäft (35), Finanzen (36) und Wissenschaft (42)",
    riskLevel: "medium",
  },
};

export function getRelatedClasses(classId: number): number[] {
  return RELATED_CLASSES_MAP[classId]?.relatedClasses || [];
}

export function getAllRelatedClasses(classIds: number[]): number[] {
  const related = new Set<number>();
  for (const classId of classIds) {
    const relatedClasses = getRelatedClasses(classId);
    for (const relatedClass of relatedClasses) {
      if (!classIds.includes(relatedClass)) {
        related.add(relatedClass);
      }
    }
  }
  return Array.from(related).sort((a, b) => a - b);
}

export function getClassRelationInfo(sourceClasses: number[], targetClass: number): {
  isDirectMatch: boolean;
  isRelated: boolean;
  relatedToClasses: number[];
  reason: string | null;
  riskLevel: "high" | "medium" | "low" | null;
} {
  if (sourceClasses.includes(targetClass)) {
    return {
      isDirectMatch: true,
      isRelated: false,
      relatedToClasses: [],
      reason: null,
      riskLevel: null,
    };
  }

  const relatedToClasses: number[] = [];
  let highestRisk: "high" | "medium" | "low" | null = null;
  let combinedReason: string | null = null;

  for (const sourceClass of sourceClasses) {
    const relation = RELATED_CLASSES_MAP[sourceClass];
    if (relation && relation.relatedClasses.includes(targetClass)) {
      relatedToClasses.push(sourceClass);
      if (!highestRisk || (relation.riskLevel === "high") || (relation.riskLevel === "medium" && highestRisk === "low")) {
        highestRisk = relation.riskLevel;
        combinedReason = relation.reason;
      }
    }
  }

  return {
    isDirectMatch: false,
    isRelated: relatedToClasses.length > 0,
    relatedToClasses,
    reason: combinedReason,
    riskLevel: highestRisk,
  };
}

export function hasOverlappingClasses(selectedClasses: number[], trademarkClasses: number[]): {
  directOverlap: number[];
  relatedOverlap: { class: number; relatedTo: number[] }[];
} {
  const directOverlap = selectedClasses.filter(c => trademarkClasses.includes(c));
  const relatedOverlap: { class: number; relatedTo: number[] }[] = [];

  for (const tmClass of trademarkClasses) {
    if (!directOverlap.includes(tmClass)) {
      const relationInfo = getClassRelationInfo(selectedClasses, tmClass);
      if (relationInfo.isRelated) {
        relatedOverlap.push({
          class: tmClass,
          relatedTo: relationInfo.relatedToClasses,
        });
      }
    }
  }

  return { directOverlap, relatedOverlap };
}
