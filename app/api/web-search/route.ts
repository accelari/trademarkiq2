import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logApiUsage } from "@/lib/api-logger";

const TAVILY_API_URL = "https://api.tavily.com/search";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    
    const userId = session.user.id;

    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
      return NextResponse.json({ 
        error: "Web-Suche nicht konfiguriert (TAVILY_API_KEY fehlt)" 
      }, { status: 501 });
    }

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query fehlt" }, { status: 400 });
    }

    console.log(`[Web-Suche] Searching for: ${query}`);

    // Deutsche Suche bevorzugen
    const germanQuery = query.includes("Germany") || query.includes("Deutschland") 
      ? query.replace("Germany", "Deutschland")
      : `${query} Deutschland`;
    
    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tavilyKey}`
      },
      body: JSON.stringify({
        query: germanQuery,
        search_depth: "advanced", // Bessere Ergebnisse
        include_answer: true,
        max_results: 5,
        include_domains: [], // Keine Einschränkung
        exclude_domains: []
      })
    });

    if (!res.ok) {
      console.error(`[Web-Suche] Tavily API error: ${res.status}`);
      return NextResponse.json({ 
        error: `Tavily API Fehler: ${res.status}` 
      }, { status: 502 });
    }

    const data = await res.json();
    console.log(`[Web-Suche] Got answer, credits used: ${data.usage?.credits || "?"}`);

    // Format response for chat display
    const sources = (data.results || []).slice(0, 5).map((r: { 
      title: string; 
      url: string; 
      content?: string;
      score?: number;
    }) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.substring(0, 300) || "",
      score: r.score || 0
    }));

    const durationMs = Date.now() - startTime;
    
    // API-Nutzung loggen und Credits abziehen
    await logApiUsage({
      userId,
      apiProvider: "tavily",
      apiEndpoint: "/api/web-search",
      units: 1, // 1 Suche
      unitType: "searches",
      durationMs,
      statusCode: 200,
      metadata: {
        query,
        resultsCount: sources.length,
        tavilyCredits: data.usage?.credits || 1,
      },
    });

    return NextResponse.json({
      success: true,
      query,
      answer: data.answer || "",
      sources,
      creditsUsed: data.usage?.credits || 1,
      responseTime: data.response_time || null
    });

  } catch (error) {
    console.error("[Web-Suche] Error:", error);
    return NextResponse.json({ error: "Fehler bei der Web-Suche" }, { status: 500 });
  }
}
