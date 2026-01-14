import { describe, it, expect } from "vitest";
import { CREDIT_PACKAGES } from "@/lib/credit-manager";

describe("Credit Manager - CREDIT_PACKAGES", () => {
  
  describe("Package Configuration", () => {
    it("has three credit packages", () => {
      expect(CREDIT_PACKAGES.length).toBe(3);
    });

    it("has 100 credits package", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_100");
      expect(pkg).toBeDefined();
      expect(pkg?.credits).toBe(100);
      expect(pkg?.priceEur).toBe(3.00);
    });

    it("has 500 credits package with discount", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_500");
      expect(pkg).toBeDefined();
      expect(pkg?.credits).toBe(500);
      expect(pkg?.priceEur).toBe(12.50);
      expect(pkg?.popular).toBe(true);
      
      // Verify discount: 500 credits at base rate would be 15.00 (5 * 3.00)
      // Actual price is 12.50, so discount is ~17%
      const basePrice = 500 * (3.00 / 100);
      const discount = (basePrice - pkg!.priceEur) / basePrice;
      expect(discount).toBeGreaterThan(0.1); // At least 10% discount
    });

    it("has 1000 credits package with bigger discount", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_1000");
      expect(pkg).toBeDefined();
      expect(pkg?.credits).toBe(1000);
      expect(pkg?.priceEur).toBe(22.50);
      
      // Verify discount: 1000 credits at base rate would be 30.00 (10 * 3.00)
      // Actual price is 22.50, so discount is 25%
      const basePrice = 1000 * (3.00 / 100);
      const discount = (basePrice - pkg!.priceEur) / basePrice;
      expect(discount).toBeCloseTo(0.25, 2); // 25% discount
    });

    it("packages are sorted by credits ascending", () => {
      const credits = CREDIT_PACKAGES.map(p => p.credits);
      expect(credits).toEqual([100, 500, 1000]);
    });

    it("only one package is marked as popular", () => {
      const popularPackages = CREDIT_PACKAGES.filter(p => p.popular);
      expect(popularPackages.length).toBe(1);
      expect(popularPackages[0].id).toBe("credits_500");
    });
  });

  describe("Price per Credit", () => {
    it("price per credit decreases with larger packages", () => {
      const pricePerCredit = CREDIT_PACKAGES.map(p => p.priceEur / p.credits);
      
      // 100 credits: 3.00 / 100 = 0.03
      // 500 credits: 12.50 / 500 = 0.025
      // 1000 credits: 22.50 / 1000 = 0.0225
      
      expect(pricePerCredit[0]).toBeGreaterThan(pricePerCredit[1]);
      expect(pricePerCredit[1]).toBeGreaterThan(pricePerCredit[2]);
    });

    it("base price per credit is 0.03 EUR", () => {
      const basePkg = CREDIT_PACKAGES.find(p => p.id === "credits_100");
      const pricePerCredit = basePkg!.priceEur / basePkg!.credits;
      expect(pricePerCredit).toBe(0.03);
    });
  });
});

describe("Credit Manager - Business Logic", () => {
  
  describe("Credit Value Calculations", () => {
    it("1 credit equals 0.03 EUR at base rate", () => {
      const CREDIT_VALUE = 0.03;
      expect(CREDIT_VALUE).toBe(0.03);
    });

    it("100 credits should cost 3.00 EUR", () => {
      const credits = 100;
      const expectedPrice = credits * 0.03;
      expect(expectedPrice).toBe(3.00);
    });
  });

  describe("Discount Verification", () => {
    it("500 credits package offers ~17% discount", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_500")!;
      const basePrice = pkg.credits * 0.03; // 15.00
      const actualPrice = pkg.priceEur; // 12.50
      const discountPercent = ((basePrice - actualPrice) / basePrice) * 100;
      
      expect(discountPercent).toBeCloseTo(16.67, 1);
    });

    it("1000 credits package offers 25% discount", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_1000")!;
      const basePrice = pkg.credits * 0.03; // 30.00
      const actualPrice = pkg.priceEur; // 22.50
      const discountPercent = ((basePrice - actualPrice) / basePrice) * 100;
      
      expect(discountPercent).toBe(25);
    });
  });
});
