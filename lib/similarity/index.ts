export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bLower.length][aLower.length];
}

export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}

const PHONETIC_REPLACEMENTS: [RegExp, string][] = [
  [/ph/gi, "f"],
  [/ck/gi, "k"],
  [/cc/gi, "k"],
  [/ce/gi, "se"],
  [/ci/gi, "si"],
  [/cy/gi, "sy"],
  [/sc/gi, "s"],
  [/sch/gi, "sh"],
  [/ch/gi, "k"],
  [/qu/gi, "kw"],
  [/x/gi, "ks"],
  [/z/gi, "s"],
  [/th/gi, "t"],
  [/wh/gi, "w"],
  [/wr/gi, "r"],
  [/kn/gi, "n"],
  [/gn/gi, "n"],
  [/gh/gi, ""],
  [/mb$/gi, "m"],
  [/ng$/gi, "n"],
  [/ie/gi, "i"],
  [/ei/gi, "ai"],
  [/ey/gi, "i"],
  [/ay/gi, "ai"],
  [/ea/gi, "i"],
  [/ee/gi, "i"],
  [/oo/gi, "u"],
  [/ou/gi, "u"],
  [/ow/gi, "o"],
  [/ue/gi, "u"],
  [/oe/gi, "o"],
  [/ae/gi, "e"],
  [/ä/gi, "e"],
  [/ö/gi, "o"],
  [/ü/gi, "u"],
  [/ß/gi, "ss"],
  [/ll/gi, "l"],
  [/rr/gi, "r"],
  [/tt/gi, "t"],
  [/ss/gi, "s"],
  [/ff/gi, "f"],
  [/pp/gi, "p"],
  [/bb/gi, "b"],
  [/dd/gi, "d"],
  [/gg/gi, "g"],
  [/mm/gi, "m"],
  [/nn/gi, "n"],
  [/é/gi, "e"],
  [/è/gi, "e"],
  [/ê/gi, "e"],
  [/ë/gi, "e"],
  [/á/gi, "a"],
  [/à/gi, "a"],
  [/â/gi, "a"],
  [/í/gi, "i"],
  [/ì/gi, "i"],
  [/î/gi, "i"],
  [/ó/gi, "o"],
  [/ò/gi, "o"],
  [/ô/gi, "o"],
  [/ú/gi, "u"],
  [/ù/gi, "u"],
  [/û/gi, "u"],
  [/ñ/gi, "n"],
  [/ç/gi, "s"],
];

export function toPhonetic(input: string): string {
  let result = input.toLowerCase().trim();
  result = result.replace(/[^a-z0-9äöüßéèêëáàâíìîóòôúùûñç]/gi, "");
  
  for (const [pattern, replacement] of PHONETIC_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

export function phoneticSimilarity(a: string, b: string): number {
  const phoneticA = toPhonetic(a);
  const phoneticB = toPhonetic(b);
  return levenshteinSimilarity(phoneticA, phoneticB);
}

export function extractCoreWords(input: string): string[] {
  let result = input.toLowerCase().trim();
  result = result.replace(/\b(dr\.?|prof\.?|ing\.?|gmbh|ag|ltd|inc|corp|llc|co\.?|kg|ohg|ug|se|sa|srl|bv|nv|partner|partners|group|holding|international)\b/gi, "");
  result = result.replace(/\s*&\s*/g, " ");
  result = result.replace(/[^a-z0-9äöüß\s]/gi, "");
  result = result.replace(/\s+/g, " ").trim();
  const words = result.split(" ");
  const significantWords = words.filter(w => w.length > 2);
  return significantWords.length > 0 ? significantWords : words.filter(w => w.length > 0);
}

export function extractCoreWord(input: string): string {
  const words = extractCoreWords(input);
  return words[0] || "";
}

export function visualSimilarity(a: string, b: string): number {
  const aClean = a.toLowerCase().replace(/[^a-z0-9]/gi, "");
  const bClean = b.toLowerCase().replace(/[^a-z0-9]/gi, "");
  return levenshteinSimilarity(aClean, bClean);
}

const VISUAL_CONFUSABLES: Record<string, string> = {
  "0": "o",
  "1": "l",
  "l": "i",
  "i": "l",
  "5": "s",
  "8": "b",
  "rn": "m",
  "cl": "d",
  "vv": "w",
};

export function normalizeVisual(input: string): string {
  let result = input.toLowerCase();
  for (const [confusable, replacement] of Object.entries(VISUAL_CONFUSABLES)) {
    result = result.replace(new RegExp(confusable, "g"), replacement);
  }
  return result;
}

export interface SimilarityResult {
  phonetic: number;
  visual: number;
  combined: number;
  coreWordMatch: boolean;
  explanation: string;
  matchedWords: { query: string; trademark: string };
}

function findBestWordMatch(queryWords: string[], tmWords: string[]): { 
  bestPhonetic: number; 
  bestVisual: number; 
  matchedQuery: string; 
  matchedTm: string;
  coreWordMatch: boolean;
} {
  let bestPhonetic = 0;
  let bestVisual = 0;
  let matchedQuery = queryWords[0] || "";
  let matchedTm = tmWords[0] || "";
  let coreWordMatch = false;
  
  for (const qWord of queryWords) {
    for (const tWord of tmWords) {
      const phonetic = phoneticSimilarity(qWord, tWord);
      const visual = visualSimilarity(qWord, tWord);
      const combined = phonetic * 0.6 + visual * 0.4;
      
      if (combined > bestPhonetic * 0.6 + bestVisual * 0.4) {
        bestPhonetic = phonetic;
        bestVisual = visual;
        matchedQuery = qWord;
        matchedTm = tWord;
      }
      
      if (qWord === tWord || levenshteinDistance(qWord, tWord) <= 1) {
        coreWordMatch = true;
      }
    }
  }
  
  return { bestPhonetic, bestVisual, matchedQuery, matchedTm, coreWordMatch };
}

export function calculateSimilarity(query: string, trademark: string): SimilarityResult {
  const queryWords = extractCoreWords(query);
  const tmWords = extractCoreWords(trademark);
  
  if (queryWords.length === 0 || tmWords.length === 0) {
    return {
      phonetic: 0,
      visual: 0,
      combined: 0,
      coreWordMatch: false,
      explanation: "Keine vergleichbaren Wörter gefunden",
      matchedWords: { query: query, trademark: trademark },
    };
  }
  
  const firstWordPhonetic = phoneticSimilarity(queryWords[0], tmWords[0]);
  const firstWordVisual = visualSimilarity(queryWords[0], tmWords[0]);
  
  const bestMatch = findBestWordMatch(queryWords, tmWords);
  
  const phonetic = Math.max(firstWordPhonetic, bestMatch.bestPhonetic);
  const visual = Math.max(firstWordVisual, bestMatch.bestVisual);
  
  const visualNormA = normalizeVisual(bestMatch.matchedQuery);
  const visualNormB = normalizeVisual(bestMatch.matchedTm);
  const visualNormSim = levenshteinSimilarity(visualNormA, visualNormB);
  
  const bestVisual = Math.max(visual, visualNormSim);
  
  const combined = Math.round(phonetic * 0.6 + bestVisual * 0.4);
  
  const coreWordMatch = bestMatch.coreWordMatch || 
    (queryWords[0] === tmWords[0]) ||
    (levenshteinDistance(queryWords[0], tmWords[0]) <= 1);
  
  let explanation = "";
  if (coreWordMatch) {
    explanation = `Kernwort-Übereinstimmung: "${bestMatch.matchedQuery}" ≈ "${bestMatch.matchedTm}"`;
  } else if (phonetic >= 80) {
    explanation = `Hohe phonetische Ähnlichkeit: "${bestMatch.matchedQuery}" klingt wie "${bestMatch.matchedTm}"`;
  } else if (bestVisual >= 80) {
    explanation = `Hohe visuelle Ähnlichkeit: "${bestMatch.matchedQuery}" sieht aus wie "${bestMatch.matchedTm}"`;
  } else if (combined >= 60) {
    explanation = `Mittlere Gesamtähnlichkeit zwischen "${bestMatch.matchedQuery}" und "${bestMatch.matchedTm}"`;
  } else {
    explanation = `Geringe Ähnlichkeit: "${bestMatch.matchedQuery}" unterscheidet sich von "${bestMatch.matchedTm}"`;
  }
  
  return {
    phonetic,
    visual: bestVisual,
    combined,
    coreWordMatch,
    explanation,
    matchedWords: { query: bestMatch.matchedQuery, trademark: bestMatch.matchedTm },
  };
}

export function isLikelyConflict(query: string, trademark: string, minCombined: number = 60): boolean {
  const sim = calculateSimilarity(query, trademark);
  return sim.combined >= minCombined || sim.coreWordMatch;
}
