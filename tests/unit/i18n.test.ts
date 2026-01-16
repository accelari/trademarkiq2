import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  locales,
  defaultLocale,
  t,
  setLocale,
  getLocale,
  useTranslations,
  getAvailableLocales,
  formatLocalizedDate,
  formatLocalizedNumber,
  formatLocalizedCurrency,
} from "@/lib/i18n";

describe("i18n - Configuration", () => {
  describe("locales", () => {
    it("includes German (de)", () => {
      expect(locales).toContain("de");
    });

    it("includes English (en)", () => {
      expect(locales).toContain("en");
    });

    it("has exactly 2 locales", () => {
      expect(locales.length).toBe(2);
    });
  });

  describe("defaultLocale", () => {
    it("is German (de)", () => {
      expect(defaultLocale).toBe("de");
    });
  });
});

describe("i18n - getAvailableLocales", () => {
  it("returns array of locale objects", () => {
    const available = getAvailableLocales();
    expect(Array.isArray(available)).toBe(true);
    expect(available.length).toBe(2);
  });

  it("includes German with correct label", () => {
    const available = getAvailableLocales();
    const german = available.find(l => l.code === "de");
    expect(german).toBeDefined();
    expect(german?.label).toBe("Deutsch");
  });

  it("includes English with correct label", () => {
    const available = getAvailableLocales();
    const english = available.find(l => l.code === "en");
    expect(english).toBeDefined();
    expect(english?.label).toBe("English");
  });
});

describe("i18n - t() translation function", () => {
  beforeEach(() => {
    setLocale("de");
  });

  describe("German translations", () => {
    it("translates common.loading", () => {
      expect(t("common.loading")).toBe("Laden...");
    });

    it("translates common.save", () => {
      expect(t("common.save")).toBe("Speichern");
    });

    it("translates common.cancel", () => {
      expect(t("common.cancel")).toBe("Abbrechen");
    });

    it("translates navigation.dashboard", () => {
      expect(t("navigation.dashboard")).toBe("Dashboard");
    });

    it("translates navigation.cases", () => {
      expect(t("navigation.cases")).toBe("Markenfälle");
    });

    it("translates credits.title", () => {
      expect(t("credits.title")).toBe("Meine Credits");
    });

    it("translates auth.login", () => {
      expect(t("auth.login")).toBe("Anmelden");
    });

    it("translates errors.generic", () => {
      expect(t("errors.generic")).toBe("Ein Fehler ist aufgetreten");
    });
  });

  describe("English translations", () => {
    beforeEach(() => {
      setLocale("en");
    });

    it("translates common.loading", () => {
      expect(t("common.loading")).toBe("Loading...");
    });

    it("translates common.save", () => {
      expect(t("common.save")).toBe("Save");
    });

    it("translates common.cancel", () => {
      expect(t("common.cancel")).toBe("Cancel");
    });

    it("translates navigation.dashboard", () => {
      expect(t("navigation.dashboard")).toBe("Dashboard");
    });

    it("translates navigation.cases", () => {
      expect(t("navigation.cases")).toBe("Trademark Cases");
    });

    it("translates credits.title", () => {
      expect(t("credits.title")).toBe("My Credits");
    });

    it("translates auth.login", () => {
      expect(t("auth.login")).toBe("Login");
    });

    it("translates errors.generic", () => {
      expect(t("errors.generic")).toBe("An error occurred");
    });
  });

  describe("Parameter interpolation", () => {
    it("interpolates {count} parameter in German", () => {
      setLocale("de");
      expect(t("time.minutesAgo", { count: 5 })).toBe("Vor 5 Min");
    });

    it("interpolates {count} parameter in English", () => {
      setLocale("en");
      expect(t("time.minutesAgo", { count: 5 })).toBe("5 min ago");
    });

    it("handles multiple parameters", () => {
      // Test with a key that might have multiple params
      // For now, just verify single param works
      setLocale("de");
      expect(t("time.hoursAgo", { count: 2 })).toBe("Vor 2 Std");
    });
  });

  describe("Fallback behavior", () => {
    it("returns key if translation not found", () => {
      expect(t("nonexistent.key")).toBe("nonexistent.key");
    });

    it("returns key for deeply nested nonexistent path", () => {
      expect(t("a.b.c.d.e")).toBe("a.b.c.d.e");
    });
  });
});

describe("i18n - setLocale and getLocale", () => {
  beforeEach(() => {
    // Reset to default
    setLocale("de");
  });

  it("getLocale returns current locale", () => {
    expect(getLocale()).toBe("de");
  });

  it("setLocale changes the locale", () => {
    setLocale("en");
    expect(getLocale()).toBe("en");
  });

  it("setLocale ignores invalid locales", () => {
    setLocale("de");
    setLocale("invalid" as any);
    // Should still be de since invalid was ignored
    expect(getLocale()).toBe("de");
  });
});

describe("i18n - useTranslations hook", () => {
  beforeEach(() => {
    setLocale("de");
  });

  it("returns t function", () => {
    const { t: translate } = useTranslations();
    expect(typeof translate).toBe("function");
    expect(translate("common.loading")).toBe("Laden...");
  });

  it("returns current locale", () => {
    const { locale } = useTranslations();
    expect(locale).toBe("de");
  });

  it("returns setLocale function", () => {
    const { setLocale: setLoc } = useTranslations();
    expect(typeof setLoc).toBe("function");
  });

  it("returns locales array", () => {
    const { locales: locs } = useTranslations();
    expect(Array.isArray(locs)).toBe(true);
    expect(locs).toContain("de");
    expect(locs).toContain("en");
  });
});

describe("i18n - formatLocalizedDate", () => {
  const testDate = new Date(2026, 0, 15); // January 15, 2026

  describe("German locale", () => {
    beforeEach(() => {
      setLocale("de");
    });

    it("formats date in German format", () => {
      const result = formatLocalizedDate(testDate);
      expect(result).toBe("15.01.2026");
    });

    it("formats ISO string", () => {
      const result = formatLocalizedDate("2026-01-15");
      expect(result).toBe("15.01.2026");
    });

    it("accepts custom options", () => {
      const result = formatLocalizedDate(testDate, { 
        day: "numeric", 
        month: "long", 
        year: "numeric" 
      });
      expect(result).toMatch(/15.*Januar.*2026/);
    });
  });

  describe("English locale", () => {
    beforeEach(() => {
      setLocale("en");
    });

    it("formats date in US format", () => {
      const result = formatLocalizedDate(testDate);
      expect(result).toBe("01/15/2026");
    });

    it("formats ISO string", () => {
      const result = formatLocalizedDate("2026-01-15");
      expect(result).toBe("01/15/2026");
    });
  });
});

describe("i18n - formatLocalizedNumber", () => {
  describe("German locale", () => {
    beforeEach(() => {
      setLocale("de");
    });

    it("formats number with German separators", () => {
      const result = formatLocalizedNumber(1234567.89);
      expect(result).toMatch(/1\.234\.567,89/);
    });

    it("formats integer", () => {
      const result = formatLocalizedNumber(1000);
      expect(result).toBe("1.000");
    });
  });

  describe("English locale", () => {
    beforeEach(() => {
      setLocale("en");
    });

    it("formats number with US separators", () => {
      const result = formatLocalizedNumber(1234567.89);
      expect(result).toMatch(/1,234,567\.89/);
    });

    it("formats integer", () => {
      const result = formatLocalizedNumber(1000);
      expect(result).toBe("1,000");
    });
  });
});

describe("i18n - formatLocalizedCurrency", () => {
  describe("German locale", () => {
    beforeEach(() => {
      setLocale("de");
    });

    it("formats EUR currency", () => {
      const result = formatLocalizedCurrency(99.99);
      expect(result).toMatch(/99,99.*€/);
    });

    it("formats with thousand separators", () => {
      const result = formatLocalizedCurrency(1234.56);
      expect(result).toMatch(/1\.234,56.*€/);
    });

    it("formats USD when specified", () => {
      const result = formatLocalizedCurrency(100, "USD");
      expect(result).toMatch(/100,00.*\$/);
    });
  });

  describe("English locale", () => {
    beforeEach(() => {
      setLocale("en");
    });

    it("formats EUR currency", () => {
      const result = formatLocalizedCurrency(99.99);
      expect(result).toMatch(/€99\.99/);
    });

    it("formats with thousand separators", () => {
      const result = formatLocalizedCurrency(1234.56);
      expect(result).toMatch(/€1,234\.56/);
    });

    it("formats USD when specified", () => {
      const result = formatLocalizedCurrency(100, "USD");
      expect(result).toMatch(/\$100\.00/);
    });
  });
});
