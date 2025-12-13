import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateSimilarity } from "@/lib/similarity";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { query, trademarks } = await request.json();
    
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query fehlt" }, { status: 400 });
    }

    const results = (trademarks || []).map((tm: any) => {
      const name = tm.name || tm.verbal || "";
      const similarity = calculateSimilarity(query, name);
      
      const isIncluded = similarity.combined >= 50 || similarity.coreWordMatch;
      const isHighApiFalsePositive = (tm.accuracy || 0) >= 85 && similarity.combined < 30;
      
      let reason = "";
      if (isHighApiFalsePositive) {
        reason = `API-Falsch-Positiv: API=${tm.accuracy}% aber unser Score=${similarity.combined}%`;
      } else if (isIncluded) {
        reason = similarity.coreWordMatch 
          ? "Kernwort-Match" 
          : `Combined >= 50% (${similarity.combined}%)`;
      } else {
        reason = `Zu geringe Ähnlichkeit (${similarity.combined}%)`;
      }
      
      return {
        trademark: name,
        apiAccuracy: tm.accuracy || 0,
        ourPhonetic: similarity.phonetic,
        ourVisual: similarity.visual,
        ourCombined: similarity.combined,
        explanation: similarity.explanation,
        matchedWords: similarity.matchedWords,
        included: isIncluded && !isHighApiFalsePositive,
        reason,
      };
    });

    const sorted = results.sort((a: any, b: any) => b.ourCombined - a.ourCombined);

    return NextResponse.json({
      query,
      totalAnalyzed: results.length,
      included: results.filter((r: any) => r.included).length,
      excluded: results.filter((r: any) => !r.included).length,
      results: sorted
    });
  } catch (error) {
    console.error("Similarity error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
