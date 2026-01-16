import { describe, it, expect } from "vitest";
import { CREDIT_PACKAGES } from "@/lib/credit-manager";

describe("Credit Manager - CREDIT_PACKAGES", () => {
  
  describe("Package Configuration", () => {
    it("has three credit packages", () => {
      expect(CREDIT_PACKAGES.length).toBe(3);
    });

    it("has 350 credits package (Einstiegspaket)", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_350");
      expect(pkg).toBeDefined();
      expect(pkg?.credits).toBe(350);
      expect(pkg?.priceEur).toBe(10.00);
      expect(pkg?.popular).toBe(false);
    });

    it("has 900 credits package with discount (Popular)", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_900");
      expect(pkg).toBeDefined();
      expect(pkg?.credits).toBe(900);
      expect(pkg?.priceEur).toBe(25.00);
      expect(pkg?.popular).toBe(true);
      
      // Verify discount: Base rate is 0.0286 EUR/Credit (350 for 10 EUR)
      // 900 credits at base rate would be 25.71 EUR
      // Actual price is 25.00 EUR, so ~3% discount
      const baseRate = 10.00 / 350; // 0.0286 EUR/Credit
      const basePrice = 900 * baseRate;
      const discount = (basePrice - pkg!.priceEur) / basePrice;
      expect(discount).toBeGreaterThan(0.02); // At least 2% discount
    });

    it("has 1900 credits package with bigger discount", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_1900");
      expect(pkg).toBeDefined();
      expect(pkg?.credits).toBe(1900);
      expect(pkg?.priceEur).toBe(50.00);
      expect(pkg?.popular).toBe(false);
      
      // Verify discount: Base rate is 0.0286 EUR/Credit (350 for 10 EUR)
      // 1900 credits at base rate would be 54.29 EUR
      // Actual price is 50.00 EUR, so ~8% discount
      const baseRate = 10.00 / 350; // 0.0286 EUR/Credit
      const basePrice = 1900 * baseRate;
      const discount = (basePrice - pkg!.priceEur) / basePrice;
      expect(discount).toBeGreaterThan(0.07); // At least 7% discount
    });

    it("packages are sorted by credits ascending", () => {
      const credits = CREDIT_PACKAGES.map(p => p.credits);
      expect(credits).toEqual([350, 900, 1900]);
    });

    it("only one package is marked as popular", () => {
      const popularPackages = CREDIT_PACKAGES.filter(p => p.popular);
      expect(popularPackages.length).toBe(1);
      expect(popularPackages[0].id).toBe("credits_900");
    });
  });

  describe("Price per Credit", () => {
    it("price per credit decreases with larger packages", () => {
      const pricePerCredit = CREDIT_PACKAGES.map(p => p.priceEur / p.credits);
      
      // 350 credits: 10.00 / 350 = 0.0286
      // 900 credits: 25.00 / 900 = 0.0278
      // 1900 credits: 50.00 / 1900 = 0.0263
      
      expect(pricePerCredit[0]).toBeGreaterThan(pricePerCredit[1]);
      expect(pricePerCredit[1]).toBeGreaterThan(pricePerCredit[2]);
    });

    it("base price per credit is ~0.0286 EUR (350 package)", () => {
      const basePkg = CREDIT_PACKAGES.find(p => p.id === "credits_350");
      const pricePerCredit = basePkg!.priceEur / basePkg!.credits;
      expect(pricePerCredit).toBeCloseTo(0.0286, 3);
    });

    it("900 package offers better value than 350 package", () => {
      const pkg350 = CREDIT_PACKAGES.find(p => p.id === "credits_350")!;
      const pkg900 = CREDIT_PACKAGES.find(p => p.id === "credits_900")!;
      
      const pricePerCredit350 = pkg350.priceEur / pkg350.credits;
      const pricePerCredit900 = pkg900.priceEur / pkg900.credits;
      
      expect(pricePerCredit900).toBeLessThan(pricePerCredit350);
    });

    it("1900 package offers best value", () => {
      const pkg900 = CREDIT_PACKAGES.find(p => p.id === "credits_900")!;
      const pkg1900 = CREDIT_PACKAGES.find(p => p.id === "credits_1900")!;
      
      const pricePerCredit900 = pkg900.priceEur / pkg900.credits;
      const pricePerCredit1900 = pkg1900.priceEur / pkg1900.credits;
      
      expect(pricePerCredit1900).toBeLessThan(pricePerCredit900);
    });
  });
});

describe("Credit Manager - Business Logic", () => {
  
  describe("Credit Value Calculations", () => {
    it("base credit value is ~0.0286 EUR", () => {
      const basePkg = CREDIT_PACKAGES.find(p => p.id === "credits_350")!;
      const CREDIT_VALUE = basePkg.priceEur / basePkg.credits;
      expect(CREDIT_VALUE).toBeCloseTo(0.0286, 3);
    });

    it("350 credits should cost 10.00 EUR", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_350")!;
      expect(pkg.priceEur).toBe(10.00);
    });

    it("900 credits should cost 25.00 EUR", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_900")!;
      expect(pkg.priceEur).toBe(25.00);
    });

    it("1900 credits should cost 50.00 EUR", () => {
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_1900")!;
      expect(pkg.priceEur).toBe(50.00);
    });
  });

  describe("Discount Verification", () => {
    it("900 credits package offers ~3% discount vs base rate", () => {
      const basePkg = CREDIT_PACKAGES.find(p => p.id === "credits_350")!;
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_900")!;
      
      const baseRate = basePkg.priceEur / basePkg.credits;
      const basePrice = pkg.credits * baseRate;
      const actualPrice = pkg.priceEur;
      const discountPercent = ((basePrice - actualPrice) / basePrice) * 100;
      
      expect(discountPercent).toBeGreaterThan(2);
      expect(discountPercent).toBeLessThan(5);
    });

    it("1900 credits package offers ~8% discount vs base rate", () => {
      const basePkg = CREDIT_PACKAGES.find(p => p.id === "credits_350")!;
      const pkg = CREDIT_PACKAGES.find(p => p.id === "credits_1900")!;
      
      const baseRate = basePkg.priceEur / basePkg.credits;
      const basePrice = pkg.credits * baseRate;
      const actualPrice = pkg.priceEur;
      const discountPercent = ((basePrice - actualPrice) / basePrice) * 100;
      
      expect(discountPercent).toBeGreaterThan(7);
      expect(discountPercent).toBeLessThan(10);
    });
  });

  describe("Package Naming", () => {
    it("all packages have correct names", () => {
      expect(CREDIT_PACKAGES[0].name).toBe("350 Credits");
      expect(CREDIT_PACKAGES[1].name).toBe("900 Credits");
      expect(CREDIT_PACKAGES[2].name).toBe("1900 Credits");
    });

    it("all packages have stripe price IDs configured", () => {
      // Note: In test environment, these may be undefined
      // But the property should exist
      CREDIT_PACKAGES.forEach(pkg => {
        expect(pkg).toHaveProperty("stripePriceId");
      });
    });
  });
});
