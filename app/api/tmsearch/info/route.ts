import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTMSearchClient } from "@/lib/tmsearch/client";

const infoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const mid = searchParams.get("mid");
    const number = searchParams.get("number");
    const type = (searchParams.get("type") || "APP") as "APP" | "REG";
    const office = searchParams.get("office");

    if (!mid && !number) {
      return NextResponse.json(
        { error: "mid oder number Parameter erforderlich" },
        { status: 400 }
      );
    }

    if (number && !office) {
      return NextResponse.json(
        { error: "office Parameter erforderlich bei Suche nach Nummer" },
        { status: 400 }
      );
    }

    const cacheKey = mid ? `mid-${mid}` : `${number}-${type}-${office}`;
    const cached = infoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    const client = getTMSearchClient();
    const trademark = await client.getInfo({
      mid: mid ? parseInt(mid) : undefined,
      number: number || undefined,
      type,
      office: office || undefined,
    });

    if (!trademark) {
      return NextResponse.json(
        { error: "Marke nicht gefunden" },
        { status: 404 }
      );
    }

    infoCache.set(cacheKey, { data: trademark, timestamp: Date.now() });

    if (infoCache.size > 200) {
      const oldestKey = infoCache.keys().next().value;
      if (oldestKey) infoCache.delete(oldestKey);
    }

    return NextResponse.json(trademark);
  } catch (error) {
    console.error("TMSearch info API error:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Markendetails" },
      { status: 500 }
    );
  }
}
