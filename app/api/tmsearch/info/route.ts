import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const TMSEARCH_INFO_URL = "https://tmsearch.ai/api/info/";
const TEST_API_KEY = "TESTAPIKEY";

interface TMInfoClass {
  number: number;
  description?: string;
  subclasses?: string[];
}

interface TMInfoResponse {
  mid?: number;
  verbal?: string;
  img?: string;
  status?: string;
  class?: TMInfoClass[];
  submition?: string;
  protection?: string[];
  app?: string;
  reg?: string;
  date?: {
    applied?: string;
    granted?: string;
    expiration?: string;
    renewal?: string;
  };
  owner?: {
    name?: string;
    address?: string;
    country?: string;
  };
  attorney?: {
    name?: string;
    address?: string;
  };
  accuracy?: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    
    // Support either mid or (number + type + office)
    const mid = body?.mid;
    const number = body?.number;
    const type = body?.type || "APP"; // APP or REG
    const office = body?.office;

    if (!mid && (!number || !office)) {
      return NextResponse.json(
        { error: "Entweder 'mid' oder ('number' + 'office') ist erforderlich" },
        { status: 400 }
      );
    }

    const apiKey = process.env.TMSEARCH_API_KEY || TEST_API_KEY;
    const isTestMode = !process.env.TMSEARCH_API_KEY;

    const url = new URL(TMSEARCH_INFO_URL);
    
    if (mid) {
      url.searchParams.set("mid", String(mid));
    } else {
      url.searchParams.set("number", String(number));
      url.searchParams.set("type", String(type));
      url.searchParams.set("office", String(office));
    }
    
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    let rawData: TMInfoResponse | string | null = null;

    if (contentType.includes("application/json")) {
      rawData = await res.json().catch(() => null);
    } else {
      const textData = await res.text().catch(() => "");
      try {
        rawData = JSON.parse(textData);
      } catch {
        rawData = textData;
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "tmsearch.ai Info-Anfrage fehlgeschlagen",
          status: res.status,
          statusText: res.statusText,
          raw: rawData,
        },
        { status: res.status }
      );
    }

    // Normalize the response for easier consumption
    const info = rawData && typeof rawData === "object" ? rawData : null;
    
    // Extract goods/services text from classes if available
    const goodsServices: string[] = [];
    if (info?.class && Array.isArray(info.class)) {
      info.class.forEach((c: TMInfoClass) => {
        if (c.description) {
          goodsServices.push(`Klasse ${c.number}: ${c.description}`);
        }
      });
    }

    return NextResponse.json({
      success: true,
      isTestMode,
      mid: info?.mid,
      verbal: info?.verbal,
      status: info?.status,
      office: info?.submition,
      protection: info?.protection,
      applicationNumber: info?.app,
      registrationNumber: info?.reg,
      dates: info?.date,
      owner: info?.owner,
      attorney: info?.attorney,
      classes: info?.class,
      goodsServices,
      imageUrl: info?.img ? `https://img.tmsearch.ai/img/210/${info.img}` : null,
      raw: rawData,
    });
  } catch (error) {
    console.error("Error in tmsearch/info:", error);
    return NextResponse.json({ error: "Fehler bei tmsearch Info-Anfrage" }, { status: 500 });
  }
}
