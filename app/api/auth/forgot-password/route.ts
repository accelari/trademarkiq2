import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-Mail-Adresse ist erforderlich" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitKey = `forgot-password:${normalizedEmail}`;
    const rateLimitResult = rateLimit(rateLimitKey, 3, 60 * 60 * 1000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Falls ein Konto mit dieser E-Mail existiert, wird ein Link zum Zurücksetzen gesendet.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
