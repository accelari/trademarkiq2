import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: "Hume API nicht konfiguriert" },
        { status: 500 }
      );
    }

    const authString = `${apiKey}:${secretKey}`;
    const encodedAuth = Buffer.from(authString).toString("base64");

    const response = await fetch(
      "https://api.hume.ai/oauth2-cc/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${encodedAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
        }).toString(),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hume token error:", errorText);
      return NextResponse.json(
        { error: "Fehler beim Abrufen des Tokens" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    });
  } catch (error) {
    console.error("Token endpoint error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
