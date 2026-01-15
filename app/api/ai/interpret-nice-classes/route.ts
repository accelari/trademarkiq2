import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { input } = await request.json();
    
    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "Input required" }, { status: 400 });
    }

    const trimmedInput = input.trim();
    
    const numericClasses = trimmedInput
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= 45);
    
    if (numericClasses.length > 0 && numericClasses.length === trimmedInput.split(/[,\s]+/).filter(s => s.trim()).length) {
      return NextResponse.json({ 
        classes: numericClasses,
        interpreted: false
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Du bist ein Experte für das Nizza-Klassifikationssystem für Marken. Der Benutzer hat folgende Eingabe für Nizza-Klassen gemacht:

"${trimmedInput}"

Interpretiere diese Eingabe und gib die entsprechenden Nizza-Klassennummern (1-45) zurück.

Beispiele:
- "alle Klassen" oder "alle" → 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45
- "Software und IT" → 9, 35, 42
- "Kleidung" oder "Mode" → 25, 35
- "Lebensmittel" → 29, 30, 31, 32
- "Kosmetik" → 3, 5, 44
- "Dienstleistungen" → 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45
- "Waren" → 1-34

Antworte NUR mit einer kommaseparierten Liste von Klassennummern, ohne weitere Erklärung. Falls du die Eingabe nicht interpretieren kannst, antworte mit "UNBEKANNT".`
        }
      ]
    });

    const textBlock = response.content.find(block => block.type === "text");
    const aiResponse = textBlock ? textBlock.text.trim() : "";

    if (aiResponse === "UNBEKANNT" || !aiResponse) {
      return NextResponse.json({ 
        classes: [],
        interpreted: true,
        error: "Konnte die Eingabe nicht interpretieren"
      });
    }

    const expandRanges = (input: string): number[] => {
      const result: number[] = [];
      const tokens = input.split(/[,\s]+/).filter(t => t.trim());
      
      for (const token of tokens) {
        const trimmed = token.trim();
        const rangeMatch = trimmed.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
        
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= 45 && start <= end) {
            for (let i = start; i <= end; i++) {
              result.push(i);
            }
          }
        } else {
          const num = parseInt(trimmed);
          if (!isNaN(num) && num >= 1 && num <= 45) {
            result.push(num);
          }
        }
      }
      
      return [...new Set(result)].sort((a, b) => a - b);
    };

    const interpretedClasses = expandRanges(aiResponse);

    return NextResponse.json({ 
      classes: interpretedClasses,
      interpreted: true
    });
  } catch (error) {
    console.error("Error interpreting Nice classes:", error);
    return NextResponse.json({ error: "Fehler bei der Interpretation" }, { status: 500 });
  }
}
