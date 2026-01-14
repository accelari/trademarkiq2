import { describe, it, expect } from "vitest";
import { calculateApiCost, API_PRICING } from "@/lib/api-logger";

describe("API Logger - calculateApiCost", () => {
  
  describe("Claude API Pricing", () => {
    it("calculates cost for Claude Sonnet 4 correctly", () => {
      const result = calculateApiCost({
        apiProvider: "claude",
        model: "claude-sonnet-4-20250514",
        inputTokens: 1000,
        outputTokens: 500,
      });
      
      // Input: 1000 tokens * $3/1M = $0.003
      // Output: 500 tokens * $15/1M = $0.0075
      // Total USD: $0.0105
      expect(result.costUsd).toBeCloseTo(0.0105, 4);
      expect(result.costEur).toBeCloseTo(0.0105 * 0.92, 4);
      expect(result.creditsCharged).toBeGreaterThan(0);
    });

    it("calculates cost for Claude Opus 4 correctly", () => {
      const result = calculateApiCost({
        apiProvider: "claude",
        model: "claude-opus-4-20250514",
        inputTokens: 1000,
        outputTokens: 500,
      });
      
      // Input: 1000 tokens * $15/1M = $0.015
      // Output: 500 tokens * $75/1M = $0.0375
      // Total USD: $0.0525
      expect(result.costUsd).toBeCloseTo(0.0525, 4);
    });

    it("uses default model pricing for unknown Claude models", () => {
      const result = calculateApiCost({
        apiProvider: "claude",
        model: "unknown-model",
        inputTokens: 1000,
        outputTokens: 500,
      });
      
      // Should use claude-opus-4-20250514 as default
      expect(result.costUsd).toBeCloseTo(0.0525, 4);
    });

    it("handles zero tokens", () => {
      const result = calculateApiCost({
        apiProvider: "claude",
        model: "claude-sonnet-4-20250514",
        inputTokens: 0,
        outputTokens: 0,
      });
      
      expect(result.costUsd).toBe(0);
      expect(result.costEur).toBe(0);
      expect(result.creditsCharged).toBe(0);
    });
  });

  describe("OpenAI API Pricing", () => {
    it("calculates cost for GPT-4o correctly", () => {
      const result = calculateApiCost({
        apiProvider: "openai",
        model: "gpt-4o",
        inputTokens: 1000,
        outputTokens: 500,
      });
      
      // Input: 1000 tokens * $2.50/1M = $0.0025
      // Output: 500 tokens * $10/1M = $0.005
      // Total USD: $0.0075
      expect(result.costUsd).toBeCloseTo(0.0075, 4);
    });

    it("calculates cost for Whisper per minute", () => {
      const result = calculateApiCost({
        apiProvider: "openai",
        model: "whisper-1",
        units: 5, // 5 minutes
        unitType: "minutes",
      });
      
      // 5 minutes * $0.006/minute = $0.03
      expect(result.costUsd).toBeCloseTo(0.03, 4);
    });
  });

  describe("TMSearch API Pricing", () => {
    it("calculates cost per search", () => {
      const result = calculateApiCost({
        apiProvider: "tmsearch",
        units: 10, // 10 searches
      });
      
      // 10 searches * $0.05/search = $0.50
      expect(result.costUsd).toBeCloseTo(0.50, 4);
    });
  });

  describe("Tavily API Pricing", () => {
    it("calculates cost per search", () => {
      const result = calculateApiCost({
        apiProvider: "tavily",
        units: 5, // 5 searches
      });
      
      // 5 searches * $0.01/search = $0.05
      expect(result.costUsd).toBeCloseTo(0.05, 4);
    });
  });

  describe("Ideogram API Pricing", () => {
    it("calculates cost for V_2_TURBO model", () => {
      const result = calculateApiCost({
        apiProvider: "ideogram",
        model: "V_2_TURBO",
        units: 3, // 3 images
      });
      
      // 3 images * $0.05/image = $0.15
      expect(result.costUsd).toBeCloseTo(0.15, 4);
    });

    it("calculates cost for V_3 model", () => {
      const result = calculateApiCost({
        apiProvider: "ideogram",
        model: "V_3",
        units: 2, // 2 images
      });
      
      // 2 images * $0.06/image = $0.12
      expect(result.costUsd).toBeCloseTo(0.12, 4);
    });
  });

  describe("BFL (FLUX) API Pricing", () => {
    it("calculates cost for flux-kontext-pro", () => {
      const result = calculateApiCost({
        apiProvider: "bfl",
        model: "flux-kontext-pro",
        units: 4, // 4 images
      });
      
      // 4 images * $0.04/image = $0.16
      expect(result.costUsd).toBeCloseTo(0.16, 4);
    });
  });

  describe("Credit Calculation", () => {
    it("applies markup and converts to credits correctly", () => {
      const result = calculateApiCost({
        apiProvider: "claude",
        model: "claude-sonnet-4-20250514",
        inputTokens: 10000,
        outputTokens: 5000,
      });
      
      // USD cost * 0.92 (EUR) * 3 (markup) / 0.03 (credit value) = credits
      const expectedCostUsd = (10000 / 1_000_000) * 3.0 + (5000 / 1_000_000) * 15.0;
      const expectedCostEur = expectedCostUsd * 0.92;
      const expectedCredits = Math.ceil(expectedCostEur * 3 / 0.03);
      
      expect(result.costUsd).toBeCloseTo(expectedCostUsd, 4);
      expect(result.creditsCharged).toBe(expectedCredits);
    });

    it("returns 0 credits for zero cost", () => {
      const result = calculateApiCost({
        apiProvider: "claude",
        model: "claude-sonnet-4-20250514",
        inputTokens: 0,
        outputTokens: 0,
      });
      
      expect(result.creditsCharged).toBe(0);
    });
  });
});

describe("API_PRICING Configuration", () => {
  it("has all required Claude models", () => {
    expect(API_PRICING.claude).toHaveProperty("claude-sonnet-4-20250514");
    expect(API_PRICING.claude).toHaveProperty("claude-opus-4-20250514");
  });

  it("has all required OpenAI models", () => {
    expect(API_PRICING.openai).toHaveProperty("gpt-4o");
    expect(API_PRICING.openai).toHaveProperty("whisper-1");
  });

  it("has all required image generation providers", () => {
    expect(API_PRICING.ideogram).toHaveProperty("V_2_TURBO");
    expect(API_PRICING.bfl).toHaveProperty("flux-kontext-pro");
  });

  it("has tmsearch and tavily pricing", () => {
    expect(API_PRICING.tmsearch).toHaveProperty("perSearch");
    expect(API_PRICING.tavily).toHaveProperty("perSearch");
  });
});
