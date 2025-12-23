export interface MeetingNote {
  type: "user" | "assistant" | "system";
  message: string;
  timestamp: Date;
}

export function hasSubstantiveContent(notes: MeetingNote[]): boolean {
  const userMessages = notes.filter((n) => n.type === "user");
  const assistantMessages = notes.filter((n) => n.type === "assistant");

  if (userMessages.length < 1 || assistantMessages.length < 1) {
    return false;
  }

  const totalChars = notes
    .filter((n) => n.type !== "system")
    .reduce((sum, n) => sum + n.message.length, 0);

  if (totalChars < 50) {
    return false;
  }

  const hasSubstantialUserMessage = userMessages.some(
    (n) => n.message.length > 10
  );

  return hasSubstantialUserMessage;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")} Min`;
}
