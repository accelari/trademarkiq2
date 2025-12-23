import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  levenshteinSimilarity,
  toPhonetic,
  phoneticSimilarity,
  visualSimilarity,
  extractCoreWords,
  calculateSimilarity,
  isLikelyConflict,
} from "@/lib/similarity";

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  it("returns correct distance for single character difference", () => {
    expect(levenshteinDistance("hello", "hallo")).toBe(1);
  });

  it("is case-insensitive", () => {
    expect(levenshteinDistance("Hello", "hello")).toBe(0);
  });

  it("handles empty strings", () => {
    expect(levenshteinDistance("", "test")).toBe(4);
    expect(levenshteinDistance("test", "")).toBe(4);
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("calculates correct distance for different strings", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });
});

describe("levenshteinSimilarity", () => {
  it("returns 100 for identical strings", () => {
    expect(levenshteinSimilarity("hello", "hello")).toBe(100);
  });

  it("returns 100 for empty strings", () => {
    expect(levenshteinSimilarity("", "")).toBe(100);
  });

  it("returns correct percentage", () => {
    const sim = levenshteinSimilarity("hello", "hallo");
    expect(sim).toBe(80);
  });
});

describe("toPhonetic", () => {
  it("converts ph to f", () => {
    expect(toPhonetic("phone")).toBe("fone");
  });

  it("converts German umlauts", () => {
    expect(toPhonetic("Müller")).toBe("muler");
    expect(toPhonetic("Schröder")).toBe("shroder");
  });

  it("handles ß", () => {
    expect(toPhonetic("Straße")).toBe("strase");
  });

  it("removes special characters", () => {
    expect(toPhonetic("test-brand")).toBe("testbrand");
  });
});

describe("phoneticSimilarity", () => {
  it("finds high similarity for phonetically similar words", () => {
    const sim = phoneticSimilarity("phone", "fone");
    expect(sim).toBe(100);
  });

  it("handles German phonetics", () => {
    const sim = phoneticSimilarity("Müller", "Mueller");
    expect(sim).toBeGreaterThan(70);
  });
});

describe("visualSimilarity", () => {
  it("returns 100 for identical strings", () => {
    expect(visualSimilarity("brand", "brand")).toBe(100);
  });

  it("ignores special characters", () => {
    expect(visualSimilarity("test-brand", "testbrand")).toBe(100);
  });
});

describe("extractCoreWords", () => {
  it("extracts simple words", () => {
    expect(extractCoreWords("Accelari")).toEqual(["accelari"]);
  });

  it("removes legal suffixes", () => {
    expect(extractCoreWords("Accelari GmbH")).toEqual(["accelari"]);
    expect(extractCoreWords("Test AG")).toEqual(["test"]);
  });

  it("handles multiple words", () => {
    expect(extractCoreWords("Blue Sky Innovations")).toEqual(["blue", "sky", "innovations"]);
  });

  it("removes short words (< 3 chars) when there are longer ones", () => {
    expect(extractCoreWords("IT Solutions")).toEqual(["solutions"]);
  });
});

describe("calculateSimilarity", () => {
  it("returns high similarity for identical marks", () => {
    const result = calculateSimilarity("Accelari", "Accelari");
    expect(result.combined).toBe(100);
    expect(result.coreWordMatch).toBe(true);
  });

  it("returns moderate similarity for similar marks", () => {
    const result = calculateSimilarity("Accelari", "Acelari");
    expect(result.combined).toBeGreaterThan(70);
  });

  it("returns low similarity for different marks", () => {
    const result = calculateSimilarity("Apple", "Microsoft");
    expect(result.combined).toBeLessThan(50);
  });

  it("handles multi-word trademarks", () => {
    const result = calculateSimilarity("Blue Sky", "Sky Blue");
    expect(result.combined).toBeGreaterThan(80);
  });

  it("handles empty input gracefully", () => {
    const result = calculateSimilarity("", "Test");
    expect(result.combined).toBe(0);
  });
});

describe("isLikelyConflict", () => {
  it("returns true for high similarity", () => {
    expect(isLikelyConflict("Accelari", "Acelari")).toBe(true);
  });

  it("returns true for core word match", () => {
    expect(isLikelyConflict("Tesla Motors", "Tesla")).toBe(true);
  });

  it("returns false for low similarity", () => {
    expect(isLikelyConflict("Apple", "Microsoft")).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isLikelyConflict("Test", "Tester", 90)).toBe(false);
    expect(isLikelyConflict("Test", "Tester", 50)).toBe(true);
  });
});
