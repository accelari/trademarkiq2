import { describe, it, expect } from "vitest";
import {
  TRIGGER_PATTERNS,
  ALL_TRIGGER_REGEX,
  filterTriggersFromContent,
  containsTriggers,
  hasRechercheSpecificTrigger,
  hasMarkennameSpecificTrigger,
} from "@/lib/triggers";

describe("Triggers - TRIGGER_PATTERNS", () => {
  describe("MARKE pattern", () => {
    it("matches [MARKE:Name]", () => {
      const match = "[MARKE:TestMarke]".match(TRIGGER_PATTERNS.MARKE);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("TestMarke");
    });

    it("matches [MARKE:Name with spaces]", () => {
      const match = "[MARKE:Test Marke Name]".match(TRIGGER_PATTERNS.MARKE);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("Test Marke Name");
    });

    it("does not match empty [MARKE:]", () => {
      const match = "[MARKE:]".match(TRIGGER_PATTERNS.MARKE);
      expect(match).toBeNull();
    });
  });

  describe("KLASSEN pattern", () => {
    it("matches single class [KLASSEN:09]", () => {
      const match = "[KLASSEN:09]".match(TRIGGER_PATTERNS.KLASSEN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("09");
    });

    it("matches multiple classes [KLASSEN:01,03,09]", () => {
      const match = "[KLASSEN:01,03,09]".match(TRIGGER_PATTERNS.KLASSEN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("01,03,09");
    });

    it("matches classes with spaces [KLASSEN:01, 03, 09]", () => {
      const match = "[KLASSEN:01, 03, 09]".match(TRIGGER_PATTERNS.KLASSEN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("01, 03, 09");
    });
  });

  describe("LAENDER pattern", () => {
    it("matches single country [LAENDER:DE]", () => {
      const match = "[LAENDER:DE]".match(TRIGGER_PATTERNS.LAENDER);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("DE");
    });

    it("matches multiple countries [LAENDER:DE,US,EU]", () => {
      const match = "[LAENDER:DE,US,EU]".match(TRIGGER_PATTERNS.LAENDER);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("DE,US,EU");
    });

    it("matches countries with spaces [LAENDER:DE, US, EU]", () => {
      const match = "[LAENDER:DE, US, EU]".match(TRIGGER_PATTERNS.LAENDER);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("DE, US, EU");
    });
  });

  describe("ART pattern", () => {
    it("matches [ART:wortmarke]", () => {
      const match = "[ART:wortmarke]".match(TRIGGER_PATTERNS.ART);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("wortmarke");
    });

    it("matches [ART:bildmarke]", () => {
      const match = "[ART:bildmarke]".match(TRIGGER_PATTERNS.ART);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("bildmarke");
    });

    it("matches [ART:wort-bildmarke]", () => {
      const match = "[ART:wort-bildmarke]".match(TRIGGER_PATTERNS.ART);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("wort-bildmarke");
    });

    it("is case insensitive", () => {
      const match = "[ART:WORTMARKE]".match(TRIGGER_PATTERNS.ART);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("wortmarke");
    });

    it("does not match invalid art types", () => {
      const match = "[ART:invalid]".match(TRIGGER_PATTERNS.ART);
      expect(match).toBeNull();
    });
  });

  describe("GOTO pattern", () => {
    it("matches [GOTO:beratung]", () => {
      const match = "[GOTO:beratung]".match(TRIGGER_PATTERNS.GOTO);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("beratung");
    });

    it("matches [GOTO:recherche]", () => {
      const match = "[GOTO:recherche]".match(TRIGGER_PATTERNS.GOTO);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("recherche");
    });

    it("matches [GOTO:anmeldung]", () => {
      const match = "[GOTO:anmeldung]".match(TRIGGER_PATTERNS.GOTO);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("anmeldung");
    });

    it("is case insensitive", () => {
      const match = "[GOTO:RECHERCHE]".match(TRIGGER_PATTERNS.GOTO);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("recherche");
    });

    it("does not match invalid accordion names", () => {
      const match = "[GOTO:invalid]".match(TRIGGER_PATTERNS.GOTO);
      expect(match).toBeNull();
    });
  });

  describe("RECHERCHE_STARTEN pattern", () => {
    it("matches [RECHERCHE_STARTEN]", () => {
      expect(TRIGGER_PATTERNS.RECHERCHE_STARTEN.test("[RECHERCHE_STARTEN]")).toBe(true);
    });

    it("does not match partial", () => {
      expect(TRIGGER_PATTERNS.RECHERCHE_STARTEN.test("RECHERCHE_STARTEN")).toBe(false);
    });
  });

  describe("WEITERE_RECHERCHE pattern", () => {
    it("matches [WEITERE_RECHERCHE]", () => {
      expect(TRIGGER_PATTERNS.WEITERE_RECHERCHE.test("[WEITERE_RECHERCHE]")).toBe(true);
    });
  });

  describe("WEB_SUCHE pattern", () => {
    it("matches [WEB_SUCHE:query]", () => {
      const match = "[WEB_SUCHE:test query]".match(TRIGGER_PATTERNS.WEB_SUCHE);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("test query");
    });
  });

  describe("LOGO_GENERIEREN pattern", () => {
    it("matches [LOGO_GENERIEREN]", () => {
      expect(TRIGGER_PATTERNS.LOGO_GENERIEREN.test("[LOGO_GENERIEREN]")).toBe(true);
    });

    it("matches [LOGO_GENERIEREN:prompt]", () => {
      const match = "[LOGO_GENERIEREN:modern minimalist]".match(TRIGGER_PATTERNS.LOGO_GENERIEREN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("modern minimalist");
    });
  });

  describe("WEITER pattern", () => {
    it("matches [WEITER:recherche]", () => {
      const match = "[WEITER:recherche]".match(TRIGGER_PATTERNS.WEITER);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("recherche");
    });

    it("matches [WEITER:anmeldung]", () => {
      const match = "[WEITER:anmeldung]".match(TRIGGER_PATTERNS.WEITER);
      expect(match).not.toBeNull();
      expect(match?.[1]?.toLowerCase()).toBe("anmeldung");
    });
  });

  describe("KOSTEN_BERECHNEN pattern", () => {
    it("matches [KOSTEN_BERECHNEN]", () => {
      expect(TRIGGER_PATTERNS.KOSTEN_BERECHNEN.test("[KOSTEN_BERECHNEN]")).toBe(true);
    });
  });
});

describe("Triggers - ALL_TRIGGER_REGEX", () => {
  it("contains all trigger patterns", () => {
    expect(ALL_TRIGGER_REGEX.length).toBe(Object.keys(TRIGGER_PATTERNS).length);
  });

  it("all patterns are RegExp objects", () => {
    ALL_TRIGGER_REGEX.forEach(pattern => {
      expect(pattern).toBeInstanceOf(RegExp);
    });
  });
});

describe("Triggers - filterTriggersFromContent", () => {
  it("removes [MARKE:] trigger", () => {
    const content = "Ich habe den Namen [MARKE:TestMarke] für Sie eingetragen.";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Ich habe den Namen  für Sie eingetragen.");
  });

  it("removes [KLASSEN:] trigger", () => {
    const content = "Die Klassen [KLASSEN:01,03,09] wurden ausgewählt.";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Die Klassen  wurden ausgewählt.");
  });

  it("removes [LAENDER:] trigger", () => {
    const content = "Die Länder [LAENDER:DE,US] wurden eingetragen.";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Die Länder  wurden eingetragen.");
  });

  it("removes [ART:] trigger", () => {
    const content = "Die Markenart [ART:wortmarke] wurde festgelegt.";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Die Markenart  wurde festgelegt.");
  });

  it("removes [GOTO:] trigger", () => {
    const content = "Bitte wechseln Sie zum Akkordeon [GOTO:recherche].";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Bitte wechseln Sie zum Akkordeon .");
  });

  it("removes [RECHERCHE_STARTEN] trigger", () => {
    const content = "Ich starte die Recherche [RECHERCHE_STARTEN] für Sie.";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Ich starte die Recherche  für Sie.");
  });

  it("removes multiple triggers", () => {
    const content = "Name: [MARKE:Test] Klassen: [KLASSEN:09] Länder: [LAENDER:DE]";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Name:  Klassen:  Länder:");
  });

  it("reduces multiple newlines to double newline", () => {
    const content = "Text\n\n\n\n\nMehr Text";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Text\n\nMehr Text");
  });

  it("trims whitespace", () => {
    const content = "  Text mit Leerzeichen  ";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("Text mit Leerzeichen");
  });

  it("handles empty string", () => {
    expect(filterTriggersFromContent("")).toBe("");
  });

  it("handles string with only triggers", () => {
    const content = "[MARKE:Test][KLASSEN:09]";
    const filtered = filterTriggersFromContent(content);
    expect(filtered).toBe("");
  });
});

describe("Triggers - containsTriggers", () => {
  it("returns true for content with [MARKE:]", () => {
    expect(containsTriggers("Text [MARKE:Test] mehr Text")).toBe(true);
  });

  it("returns true for content with [KLASSEN:]", () => {
    expect(containsTriggers("Text [KLASSEN:09] mehr Text")).toBe(true);
  });

  it("returns true for content with [LAENDER:]", () => {
    expect(containsTriggers("Text [LAENDER:DE] mehr Text")).toBe(true);
  });

  it("returns true for content with [ART:]", () => {
    expect(containsTriggers("Text [ART:wortmarke] mehr Text")).toBe(true);
  });

  it("returns true for content with [GOTO:]", () => {
    expect(containsTriggers("Text [GOTO:recherche] mehr Text")).toBe(true);
  });

  it("returns true for content with [RECHERCHE_STARTEN]", () => {
    expect(containsTriggers("Text [RECHERCHE_STARTEN] mehr Text")).toBe(true);
  });

  it("returns false for content without triggers", () => {
    expect(containsTriggers("Normaler Text ohne Trigger")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsTriggers("")).toBe(false);
  });

  it("returns false for partial trigger syntax", () => {
    expect(containsTriggers("Text [MARKE ohne Klammer")).toBe(false);
  });
});

describe("Triggers - hasRechercheSpecificTrigger", () => {
  it("detects [RECHERCHE_STARTEN]", () => {
    const result = hasRechercheSpecificTrigger("Text [RECHERCHE_STARTEN] mehr");
    expect(result.rechercheStarten).toBe(true);
    expect(result.weitereRecherche).toBe(false);
    expect(result.webSuche).toBeNull();
  });

  it("detects [WEITERE_RECHERCHE]", () => {
    const result = hasRechercheSpecificTrigger("Text [WEITERE_RECHERCHE] mehr");
    expect(result.rechercheStarten).toBe(false);
    expect(result.weitereRecherche).toBe(true);
    expect(result.webSuche).toBeNull();
  });

  it("detects [WEB_SUCHE:query]", () => {
    const result = hasRechercheSpecificTrigger("Text [WEB_SUCHE:test query] mehr");
    expect(result.rechercheStarten).toBe(false);
    expect(result.weitereRecherche).toBe(false);
    expect(result.webSuche).toBe("test query");
  });

  it("detects multiple triggers", () => {
    const result = hasRechercheSpecificTrigger("[RECHERCHE_STARTEN] [WEB_SUCHE:test]");
    expect(result.rechercheStarten).toBe(true);
    expect(result.webSuche).toBe("test");
  });

  it("returns all false for no triggers", () => {
    const result = hasRechercheSpecificTrigger("Normaler Text");
    expect(result.rechercheStarten).toBe(false);
    expect(result.weitereRecherche).toBe(false);
    expect(result.webSuche).toBeNull();
  });
});

describe("Triggers - hasMarkennameSpecificTrigger", () => {
  it("detects [LOGO_GENERIEREN]", () => {
    const result = hasMarkennameSpecificTrigger("Text [LOGO_GENERIEREN] mehr");
    expect(result.logoGenerieren).toBe("default");
    expect(result.logoBearbeiten).toBeNull();
  });

  it("detects [LOGO_GENERIEREN:prompt]", () => {
    const result = hasMarkennameSpecificTrigger("Text [LOGO_GENERIEREN:modern style] mehr");
    expect(result.logoGenerieren).toBe("modern style");
    expect(result.logoBearbeiten).toBeNull();
  });

  it("detects [LOGO_BEARBEITEN:id]", () => {
    const result = hasMarkennameSpecificTrigger("Text [LOGO_BEARBEITEN:logo123] mehr");
    expect(result.logoGenerieren).toBeNull();
    expect(result.logoBearbeiten).toBe("logo123");
  });

  it("returns all null for no triggers", () => {
    const result = hasMarkennameSpecificTrigger("Normaler Text");
    expect(result.logoGenerieren).toBeNull();
    expect(result.logoBearbeiten).toBeNull();
  });
});
