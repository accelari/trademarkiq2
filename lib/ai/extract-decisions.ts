import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { caseDecisions } from "@/db/schema";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

const COUNTRY_MAPPING: Record<string, string | string[]> = {
  "deutschland": "DE",
  "germany": "DE",
  "österreich": "AT",
  "austria": "AT",
  "schweiz": "CH",
  "switzerland": "CH",
  "europa": "EU",
  "eu": "EU",
  "europäische union": "EU",
  "european union": "EU",
  "usa": "US",
  "vereinigte staaten": "US",
  "united states": "US",
  "amerika": "US",
  "dach": ["DE", "AT", "CH"],
  "frankreich": "FR",
  "france": "FR",
  "italien": "IT",
  "italy": "IT",
  "spanien": "ES",
  "spain": "ES",
  "niederlande": "NL",
  "netherlands": "NL",
  "holland": "NL",
  "belgien": "BE",
  "belgium": "BE",
  "polen": "PL",
  "poland": "PL",
  "großbritannien": "GB",
  "uk": "GB",
  "united kingdom": "GB",
  "england": "GB",
  "china": "CN",
  "japan": "JP",
  "kanada": "CA",
  "canada": "CA",
  "australien": "AU",
  "australia": "AU",
  "international": "WIPO",
  "weltweit": "WIPO",
  "worldwide": "WIPO",
};

const CLASS_KEYWORD_MAPPING: Record<string, number> = {
  "software": 9,
  "app": 9,
  "apps": 9,
  "computer": 9,
  "elektronik": 9,
  "electronics": 9,
  "hardware": 9,
  "beratung": 35,
  "consulting": 35,
  "unternehmensberatung": 35,
  "business consulting": 35,
  "marketing": 35,
  "werbung": 35,
  "advertising": 35,
  "it-dienste": 42,
  "it-dienstleistungen": 42,
  "it services": 42,
  "saas": 42,
  "softwareentwicklung": 42,
  "software development": 42,
  "cloud": 42,
  "hosting": 42,
  "webdesign": 42,
  "bekleidung": 25,
  "kleidung": 25,
  "clothing": 25,
  "mode": 25,
  "fashion": 25,
  "schuhe": 25,
  "shoes": 25,
  "kosmetik": 3,
  "cosmetics": 3,
  "parfüm": 3,
  "perfume": 3,
  "restaurant": 43,
  "gastronomie": 43,
  "hotel": 43,
  "beherbergung": 43,
  "catering": 43,
  "finanzen": 36,
  "finance": 36,
  "banking": 36,
  "versicherung": 36,
  "insurance": 36,
  "immobilien": 36,
  "real estate": 36,
  "telekommunikation": 38,
  "telecommunications": 38,
  "bildung": 41,
  "education": 41,
  "training": 41,
  "schulung": 41,
  "unterhaltung": 41,
  "entertainment": 41,
  "sport": 41,
  "medizin": 44,
  "medical": 44,
  "gesundheit": 44,
  "health": 44,
  "pharma": 5,
  "pharmaceutical": 5,
  "lebensmittel": 29,
  "food": 29,
  "getränke": 32,
  "beverages": 32,
  "drinks": 32,
  "schmuck": 14,
  "jewelry": 14,
  "uhren": 14,
  "watches": 14,
};

const EXTRACTION_PROMPT = `Du bist ein Experte für Markenrecht und analysierst Beratungs-Zusammenfassungen.

Deine Aufgabe ist es, aus der folgenden Beratungs-Zusammenfassung strukturierte Entscheidungen zu extrahieren.

EXTRAHIERE FOLGENDES:
1. MARKENNAMEN: Alle erwähnten Marken oder Markennamen, die der Kunde schützen möchte
2. LÄNDER: Alle Länder oder Regionen, in denen die Marke geschützt werden soll
3. NIZZA-KLASSEN: Alle erwähnten Warenklassen (Zahlen 1-45) oder Branchen/Produktkategorien

REGELN:
- Extrahiere nur EXPLIZIT genannte Informationen
- Bei Unsicherheit, setze ein niedrigeres Konfidenz-Level
- Länder als ISO-Codes zurückgeben (DE, AT, CH, EU, US, etc.)
- Nizza-Klassen als Zahlen 1-45

BEWERTUNG:
- Vollständigkeit (0-100): Name vorhanden = 33%, Land vorhanden = 33%, Klasse vorhanden = 33%
- Konfidenz (0-100): Wie klar und eindeutig sind die Aussagen?
  - 90-100: Sehr klare, explizite Aussagen
  - 70-89: Klare Aussagen mit wenig Interpretationsspielraum
  - 50-69: Aussagen erfordern etwas Interpretation
  - 0-49: Vage oder unklare Aussagen

Antworte NUR mit diesem JSON-Format (keine zusätzlichen Erklärungen):
{
  "trademarkNames": ["Markenname1", "Markenname2"],
  "countries": ["DE", "AT", "CH"],
  "niceClasses": [9, 35, 42],
  "completenessScore": 66,
  "confidenceScore": 85,
  "reasoning": "Kurze Begründung für die Bewertung"
}`;

interface ExtractedDecisions {
  trademarkNames: string[];
  countries: string[];
  niceClasses: number[];
  completenessScore: number;
  confidenceScore: number;
  needsConfirmation: boolean;
}

function normalizeCountry(country: string): string[] {
  const normalized = country.toLowerCase().trim();
  const mapping = COUNTRY_MAPPING[normalized];
  
  if (Array.isArray(mapping)) {
    return mapping;
  } else if (mapping) {
    return [mapping];
  }
  
  if (normalized.length === 2 && normalized === normalized.toUpperCase()) {
    return [normalized];
  }
  
  return [];
}

function normalizeClass(classInput: string | number): number | null {
  if (typeof classInput === "number") {
    return classInput >= 1 && classInput <= 45 ? classInput : null;
  }
  
  const normalized = classInput.toLowerCase().trim();
  
  const numMatch = normalized.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (num >= 1 && num <= 45) {
      return num;
    }
  }
  
  for (const [keyword, classNum] of Object.entries(CLASS_KEYWORD_MAPPING)) {
    if (normalized.includes(keyword)) {
      return classNum;
    }
  }
  
  return null;
}

export async function extractDecisionsFromSummary(
  summary: string,
  caseId: string,
  consultationId: string
): Promise<ExtractedDecisions> {
  if (!summary?.trim()) {
    const emptyResult: ExtractedDecisions = {
      trademarkNames: [],
      countries: [],
      niceClasses: [],
      completenessScore: 0,
      confidenceScore: 0,
      needsConfirmation: true,
    };
    
    await db.insert(caseDecisions).values({
      caseId,
      consultationId,
      trademarkNames: [],
      countries: [],
      niceClasses: [],
      completenessScore: 0,
      confidenceScore: 0,
      needsConfirmation: true,
      rawSummary: summary || "",
    });
    
    return emptyResult;
  }

  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 1024,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analysiere diese Beratungs-Zusammenfassung und extrahiere die Entscheidungen:\n\n${summary}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unerwarteter Antworttyp von Claude");
  }

  let parsed: {
    trademarkNames?: string[];
    countries?: string[];
    niceClasses?: (string | number)[];
    completenessScore?: number;
    confidenceScore?: number;
    reasoning?: string;
  };

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Keine JSON-Antwort gefunden");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Fehler beim Parsen der KI-Antwort:", error);
    parsed = {
      trademarkNames: [],
      countries: [],
      niceClasses: [],
      completenessScore: 0,
      confidenceScore: 0,
    };
  }

  const trademarkNames = Array.isArray(parsed.trademarkNames)
    ? parsed.trademarkNames.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    : [];

  const rawCountries = Array.isArray(parsed.countries) ? parsed.countries : [];
  const countries = rawCountries
    .flatMap((c) => (typeof c === "string" ? normalizeCountry(c) : []))
    .filter((c, i, arr) => arr.indexOf(c) === i);

  const rawClasses = Array.isArray(parsed.niceClasses) ? parsed.niceClasses : [];
  const niceClasses = rawClasses
    .map((c) => normalizeClass(c))
    .filter((c): c is number => c !== null)
    .filter((c, i, arr) => arr.indexOf(c) === i)
    .sort((a, b) => a - b);

  let completenessScore = 0;
  if (trademarkNames.length > 0) completenessScore += 33;
  if (countries.length > 0) completenessScore += 33;
  if (niceClasses.length > 0) completenessScore += 34;

  const confidenceScore = typeof parsed.confidenceScore === "number"
    ? Math.max(0, Math.min(100, parsed.confidenceScore))
    : 50;

  const needsConfirmation = confidenceScore < 70;

  await db.insert(caseDecisions).values({
    caseId,
    consultationId,
    trademarkNames,
    countries,
    niceClasses,
    completenessScore,
    confidenceScore,
    needsConfirmation,
    rawSummary: summary,
  });

  return {
    trademarkNames,
    countries,
    niceClasses,
    completenessScore,
    confidenceScore,
    needsConfirmation,
  };
}
