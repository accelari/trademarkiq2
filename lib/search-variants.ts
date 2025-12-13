export interface SearchVariant {
  term: string;
  type: "exact" | "phonetic" | "visual" | "root" | "misspelling";
  rationale: string;
}

export interface DeterministicStrategy {
  variants: SearchVariant[];
  strategyNarrative: string;
  classRisks: { classId: number; className: string; typicalConflicts: string; riskFocus: string }[];
  countryNotes: string;
}

const GERMAN_PHONETIC_RULES: [RegExp, string, string][] = [
  [/ä/gi, "ae", "Umlaut ä → ae"],
  [/ö/gi, "oe", "Umlaut ö → oe"],
  [/ü/gi, "ue", "Umlaut ü → ue"],
  [/ß/gi, "ss", "ß → ss"],
  [/sch/gi, "sh", "sch → sh"],
  [/ch/gi, "k", "ch → k"],
  [/ei/gi, "ai", "ei → ai"],
  [/eu/gi, "oi", "eu → oi"],
  [/ph/gi, "f", "ph → f"],
  [/qu/gi, "kw", "qu → kw"],
  [/v/gi, "f", "v → f (deutsch)"],
  [/z/gi, "ts", "z → ts"],
];

const ENGLISH_PHONETIC_RULES: [RegExp, string, string][] = [
  [/ph/gi, "f", "ph → f"],
  [/ck/gi, "k", "ck → k"],
  [/gh/gi, "", "gh → (stumm)"],
  [/ough/gi, "o", "ough → o"],
  [/tion/gi, "shun", "tion → shun"],
  [/th/gi, "t", "th → t"],
  [/wh/gi, "w", "wh → w"],
  [/wr/gi, "r", "wr → r"],
  [/kn/gi, "n", "kn → n"],
  [/c(?=[ei])/gi, "s", "c → s (vor e/i)"],
  [/x/gi, "ks", "x → ks"],
];

const VISUAL_SIMILARITY_RULES: [RegExp, string, string][] = [
  [/l/gi, "i", "l → I (visuell)"],
  [/I/g, "l", "I → l (visuell)"],
  [/0/g, "o", "0 → O (visuell)"],
  [/o/gi, "0", "O → 0 (visuell)"],
  [/rn/gi, "m", "rn → m (visuell)"],
  [/cl/gi, "d", "cl → d (visuell)"],
  [/vv/gi, "w", "vv → w (visuell)"],
  [/1/g, "l", "1 → l (visuell)"],
];

const COMMON_MISSPELLINGS: [RegExp, string, string][] = [
  [/(.)\1/g, "$1", "Buchstabe verdoppelt → einfach"],
  [/ie/gi, "ei", "ie ↔ ei Vertauschung"],
  [/ei/gi, "ie", "ei ↔ ie Vertauschung"],
];

function applyRule(term: string, pattern: RegExp, replacement: string): string {
  return term.replace(pattern, replacement);
}

function generatePhoneticVariants(term: string): SearchVariant[] {
  const variants: SearchVariant[] = [];
  const seen = new Set<string>([term.toLowerCase()]);
  
  for (const [pattern, replacement, rationale] of GERMAN_PHONETIC_RULES) {
    if (pattern.test(term)) {
      const variant = applyRule(term, pattern, replacement);
      if (!seen.has(variant.toLowerCase()) && variant.toLowerCase() !== term.toLowerCase()) {
        seen.add(variant.toLowerCase());
        variants.push({
          term: variant,
          type: "phonetic",
          rationale: `Deutsche Phonetik: ${rationale}`,
        });
      }
    }
  }
  
  for (const [pattern, replacement, rationale] of ENGLISH_PHONETIC_RULES) {
    if (pattern.test(term)) {
      const variant = applyRule(term, pattern, replacement);
      if (!seen.has(variant.toLowerCase()) && variant.toLowerCase() !== term.toLowerCase()) {
        seen.add(variant.toLowerCase());
        variants.push({
          term: variant,
          type: "phonetic",
          rationale: `Englische Phonetik: ${rationale}`,
        });
      }
    }
  }
  
  return variants;
}

function generateVisualVariants(term: string): SearchVariant[] {
  const variants: SearchVariant[] = [];
  const seen = new Set<string>([term.toLowerCase()]);
  
  for (const [pattern, replacement, rationale] of VISUAL_SIMILARITY_RULES) {
    if (pattern.test(term)) {
      const variant = applyRule(term, pattern, replacement);
      if (!seen.has(variant.toLowerCase()) && variant.toLowerCase() !== term.toLowerCase()) {
        seen.add(variant.toLowerCase());
        variants.push({
          term: variant,
          type: "visual",
          rationale: `Visuelle Ähnlichkeit: ${rationale}`,
        });
      }
    }
  }
  
  const noSpaces = term.replace(/\s+/g, "");
  if (noSpaces !== term && !seen.has(noSpaces.toLowerCase())) {
    seen.add(noSpaces.toLowerCase());
    variants.push({
      term: noSpaces,
      type: "visual",
      rationale: "Ohne Leerzeichen",
    });
  }
  
  const withHyphen = term.replace(/\s+/g, "-");
  if (withHyphen !== term && !seen.has(withHyphen.toLowerCase())) {
    seen.add(withHyphen.toLowerCase());
    variants.push({
      term: withHyphen,
      type: "visual",
      rationale: "Mit Bindestrich",
    });
  }
  
  return variants;
}

function generateMisspellingVariants(term: string): SearchVariant[] {
  const variants: SearchVariant[] = [];
  const seen = new Set<string>([term.toLowerCase()]);
  
  for (let i = 0; i < term.length; i++) {
    const doubled = term.slice(0, i) + term[i] + term.slice(i);
    if (!seen.has(doubled.toLowerCase())) {
      seen.add(doubled.toLowerCase());
      variants.push({
        term: doubled,
        type: "misspelling",
        rationale: `Buchstabe "${term[i]}" verdoppelt`,
      });
    }
  }
  
  if (term.length > 3) {
    for (let i = 1; i < term.length - 1; i++) {
      const omitted = term.slice(0, i) + term.slice(i + 1);
      if (!seen.has(omitted.toLowerCase())) {
        seen.add(omitted.toLowerCase());
        variants.push({
          term: omitted,
          type: "misspelling",
          rationale: `Buchstabe "${term[i]}" ausgelassen`,
        });
      }
    }
  }
  
  for (let i = 0; i < term.length - 1; i++) {
    const swapped = term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2);
    if (!seen.has(swapped.toLowerCase())) {
      seen.add(swapped.toLowerCase());
      variants.push({
        term: swapped,
        type: "misspelling",
        rationale: `Buchstaben "${term[i]}${term[i+1]}" vertauscht`,
      });
    }
  }
  
  return variants;
}

function generateRootVariants(term: string): SearchVariant[] {
  const variants: SearchVariant[] = [];
  const seen = new Set<string>([term.toLowerCase()]);
  
  const prefixes = ["e", "i", "my", "smart", "eco", "bio", "cyber", "digi", "pro", "neo", "meta"];
  const suffixes = ["ify", "ly", "ware", "tech", "soft", "cloud", "ai", "io", "app", "hub"];
  
  for (const prefix of prefixes) {
    if (term.toLowerCase().startsWith(prefix) && term.length > prefix.length + 2) {
      const root = term.slice(prefix.length);
      if (!seen.has(root.toLowerCase())) {
        seen.add(root.toLowerCase());
        variants.push({
          term: root,
          type: "root",
          rationale: `Wortstamm ohne Präfix "${prefix}"`,
        });
      }
    }
  }
  
  for (const suffix of suffixes) {
    if (term.toLowerCase().endsWith(suffix) && term.length > suffix.length + 2) {
      const root = term.slice(0, -suffix.length);
      if (!seen.has(root.toLowerCase())) {
        seen.add(root.toLowerCase());
        variants.push({
          term: root,
          type: "root",
          rationale: `Wortstamm ohne Suffix "${suffix}"`,
        });
      }
    }
  }
  
  return variants;
}

export function generateDeterministicVariants(
  markenname: string,
  maxVariants: number = 8
): DeterministicStrategy {
  const term = markenname.trim();
  const allVariants: SearchVariant[] = [];
  const seen = new Set<string>();
  
  allVariants.push({
    term: term,
    type: "exact",
    rationale: "Exakte Schreibweise",
  });
  seen.add(term.toLowerCase());
  
  const phoneticVars = generatePhoneticVariants(term);
  const visualVars = generateVisualVariants(term);
  const misspellingVars = generateMisspellingVariants(term);
  const rootVars = generateRootVariants(term);
  
  const prioritized = [
    ...phoneticVars.slice(0, 3),
    ...visualVars.slice(0, 2),
    ...misspellingVars.slice(0, 2),
    ...rootVars.slice(0, 1),
  ];
  
  for (const variant of prioritized) {
    if (!seen.has(variant.term.toLowerCase())) {
      seen.add(variant.term.toLowerCase());
      allVariants.push(variant);
    }
    if (allVariants.length >= maxVariants) break;
  }
  
  return {
    variants: allVariants.slice(0, maxVariants),
    strategyNarrative: `Deterministische Markenrecherche für "${term}" mit ${allVariants.length} systematisch generierten Varianten. Die Suche umfasst phonetische Ähnlichkeiten (deutsche und englische Aussprache), visuelle Verwechslungsmöglichkeiten und häufige Tippfehler.`,
    classRisks: [],
    countryNotes: "Suche in allen ausgewählten Registern mit WIPO-Erweiterung.",
  };
}

export function getCacheKey(markenname: string, klassen: number[], laender: string[], searchType: "deterministic" | "deep" = "deterministic"): string {
  return `${markenname.toLowerCase().trim()}_${klassen.sort().join(",")}_${laender.sort().join(",")}_${searchType}`;
}

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }
  
  get(key: K): V | null {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const strategyCache = new LRUCache<string, DeterministicStrategy>(100);

export function getCachedStrategy(cacheKey: string): DeterministicStrategy | null {
  return strategyCache.get(cacheKey);
}

export function setCachedStrategy(cacheKey: string, strategy: DeterministicStrategy): void {
  strategyCache.set(cacheKey, strategy);
}

export function clearStrategyCache(): void {
  strategyCache.clear();
}
