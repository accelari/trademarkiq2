import { describe, it, expect } from "vitest";
import { hasSubstantiveContent, formatDuration, MeetingNote } from "@/lib/content-validation";

describe("hasSubstantiveContent", () => {
  it("returns false for empty notes", () => {
    expect(hasSubstantiveContent([])).toBe(false);
  });

  it("returns false when only system messages", () => {
    const notes: MeetingNote[] = [
      { type: "system", message: "Session started", timestamp: new Date() },
    ];
    expect(hasSubstantiveContent(notes)).toBe(false);
  });

  it("returns false when only user message without assistant reply", () => {
    const notes: MeetingNote[] = [
      { type: "user", message: "Hello, I need help", timestamp: new Date() },
    ];
    expect(hasSubstantiveContent(notes)).toBe(false);
  });

  it("returns false when total characters < 50", () => {
    const notes: MeetingNote[] = [
      { type: "user", message: "Hi", timestamp: new Date() },
      { type: "assistant", message: "Hello", timestamp: new Date() },
    ];
    expect(hasSubstantiveContent(notes)).toBe(false);
  });

  it("returns false when no user message > 10 chars", () => {
    const notes: MeetingNote[] = [
      { type: "user", message: "Hi", timestamp: new Date() },
      { type: "assistant", message: "Hello! How can I help you today? What would you like to know?", timestamp: new Date() },
    ];
    expect(hasSubstantiveContent(notes)).toBe(false);
  });

  it("returns true for valid conversation", () => {
    const notes: MeetingNote[] = [
      { type: "system", message: "Session started", timestamp: new Date() },
      { type: "user", message: "I want to register the trademark Accelari for software services", timestamp: new Date() },
      { type: "assistant", message: "That sounds great! Let me help you with your trademark registration.", timestamp: new Date() },
    ];
    expect(hasSubstantiveContent(notes)).toBe(true);
  });

  it("ignores system messages in character count", () => {
    const notes: MeetingNote[] = [
      { type: "system", message: "A".repeat(100), timestamp: new Date() },
      { type: "user", message: "Hi", timestamp: new Date() },
      { type: "assistant", message: "Hello", timestamp: new Date() },
    ];
    expect(hasSubstantiveContent(notes)).toBe(false);
  });
});

describe("formatDuration", () => {
  it("returns '-' for null", () => {
    expect(formatDuration(null)).toBe("-");
  });

  it("returns '-' for 0", () => {
    expect(formatDuration(0)).toBe("-");
  });

  it("formats seconds correctly", () => {
    expect(formatDuration(65)).toBe("1:05 Min");
    expect(formatDuration(120)).toBe("2:00 Min");
    expect(formatDuration(90)).toBe("1:30 Min");
  });

  it("handles single digit seconds", () => {
    expect(formatDuration(61)).toBe("1:01 Min");
    expect(formatDuration(9)).toBe("0:09 Min");
  });
});
