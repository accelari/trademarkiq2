import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";

describe("Utils - cn (className merger)", () => {
  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active", false && "hidden")).toBe("base active");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays of classes", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });
});

describe("Utils - formatDate", () => {
  it("formats ISO date string to German format", () => {
    const result = formatDate("2026-01-15");
    expect(result).toBe("15.01.2026");
  });

  it("formats Date object to German format", () => {
    const date = new Date(2026, 0, 15); // January 15, 2026
    const result = formatDate(date);
    expect(result).toBe("15.01.2026");
  });

  it("handles invalid date string", () => {
    const result = formatDate("invalid-date");
    expect(result).toBe("Ungültiges Datum");
  });

  it("handles invalid Date object", () => {
    const result = formatDate(new Date("invalid"));
    expect(result).toBe("Ungültiges Datum");
  });

  it("formats with short year option", () => {
    const result = formatDate("2026-01-15", { shortYear: true });
    expect(result).toBe("15.01.26");
  });

  it("formats with time included", () => {
    const result = formatDate("2026-01-15T14:30:00", { includeTime: true });
    expect(result).toMatch(/15\.01\.2026.*14:30/);
  });

  it("formats with both options", () => {
    const result = formatDate("2026-01-15T14:30:00", { 
      includeTime: true, 
      shortYear: true 
    });
    expect(result).toMatch(/15\.01\.26.*14:30/);
  });
});

describe("Utils - formatTime", () => {
  it("formats ISO date string to time", () => {
    const result = formatTime("2026-01-15T14:30:00");
    expect(result).toBe("14:30");
  });

  it("formats Date object to time", () => {
    const date = new Date(2026, 0, 15, 14, 30);
    const result = formatTime(date);
    expect(result).toBe("14:30");
  });

  it("handles invalid date string", () => {
    const result = formatTime("invalid-date");
    expect(result).toBe("Ungültige Zeit");
  });

  it("formats midnight correctly", () => {
    const result = formatTime("2026-01-15T00:00:00");
    expect(result).toBe("00:00");
  });

  it("formats noon correctly", () => {
    const result = formatTime("2026-01-15T12:00:00");
    expect(result).toBe("12:00");
  });
});

describe("Utils - formatDateTime", () => {
  it("combines date and time formatting", () => {
    const result = formatDateTime("2026-01-15T14:30:00");
    expect(result).toBe("15.01.2026 14:30");
  });

  it("formats Date object", () => {
    const date = new Date(2026, 0, 15, 14, 30);
    const result = formatDateTime(date);
    expect(result).toBe("15.01.2026 14:30");
  });

  it("handles invalid date", () => {
    const result = formatDateTime("invalid");
    expect(result).toBe("Ungültiges Datum Ungültige Zeit");
  });
});

describe("Utils - formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'gerade eben' for times less than 60 seconds ago", () => {
    const date = new Date("2026-01-15T11:59:30");
    expect(formatRelativeTime(date)).toBe("gerade eben");
  });

  it("returns minutes ago for times less than 60 minutes ago", () => {
    const date = new Date("2026-01-15T11:55:00");
    expect(formatRelativeTime(date)).toBe("vor 5 Minuten");
  });

  it("returns singular minute", () => {
    const date = new Date("2026-01-15T11:59:00");
    expect(formatRelativeTime(date)).toBe("vor 1 Minute");
  });

  it("returns hours ago for times less than 24 hours ago", () => {
    const date = new Date("2026-01-15T09:00:00");
    expect(formatRelativeTime(date)).toBe("vor 3 Stunden");
  });

  it("returns singular hour", () => {
    const date = new Date("2026-01-15T11:00:00");
    expect(formatRelativeTime(date)).toBe("vor 1 Stunde");
  });

  it("returns days ago for times less than 7 days ago", () => {
    const date = new Date("2026-01-13T12:00:00");
    expect(formatRelativeTime(date)).toBe("vor 2 Tagen");
  });

  it("returns singular day", () => {
    const date = new Date("2026-01-14T12:00:00");
    expect(formatRelativeTime(date)).toBe("vor 1 Tag");
  });

  it("returns formatted date for times more than 7 days ago", () => {
    const date = new Date("2026-01-01T12:00:00");
    expect(formatRelativeTime(date)).toBe("01.01.2026");
  });

  it("handles ISO string input", () => {
    expect(formatRelativeTime("2026-01-15T11:55:00")).toBe("vor 5 Minuten");
  });
});

describe("Utils - formatNumber", () => {
  it("formats integer with thousand separators", () => {
    expect(formatNumber(1000)).toBe("1.000");
    expect(formatNumber(1000000)).toBe("1.000.000");
  });

  it("formats decimal numbers", () => {
    const result = formatNumber(1234.56);
    expect(result).toMatch(/1\.234,56/);
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-1000)).toBe("-1.000");
  });

  it("formats small numbers without separators", () => {
    expect(formatNumber(999)).toBe("999");
  });
});

describe("Utils - formatCurrency", () => {
  it("formats EUR by default", () => {
    const result = formatCurrency(99.99);
    expect(result).toMatch(/99,99.*€/);
  });

  it("formats with thousand separators", () => {
    const result = formatCurrency(1234.56);
    expect(result).toMatch(/1\.234,56.*€/);
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0,00.*€/);
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-50);
    expect(result).toMatch(/-50,00.*€/);
  });

  it("formats USD when specified", () => {
    const result = formatCurrency(100, "USD");
    expect(result).toMatch(/100,00.*\$/);
  });

  it("always shows two decimal places", () => {
    const result = formatCurrency(100);
    expect(result).toMatch(/100,00/);
  });
});

describe("Utils - formatPercent", () => {
  it("formats percentage value", () => {
    expect(formatPercent(50)).toBe("50.0%");
    expect(formatPercent(99.5)).toBe("99.5%");
  });

  it("formats decimal value when isDecimal is true", () => {
    expect(formatPercent(0.5, true)).toBe("50.0%");
    expect(formatPercent(0.995, true)).toBe("99.5%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats 100%", () => {
    expect(formatPercent(100)).toBe("100.0%");
    expect(formatPercent(1, true)).toBe("100.0%");
  });

  it("formats values over 100%", () => {
    expect(formatPercent(150)).toBe("150.0%");
  });

  it("formats negative percentages", () => {
    expect(formatPercent(-10)).toBe("-10.0%");
  });

  it("rounds to one decimal place", () => {
    expect(formatPercent(33.333)).toBe("33.3%");
    expect(formatPercent(66.666)).toBe("66.7%");
  });
});
