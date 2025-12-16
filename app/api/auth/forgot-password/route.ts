import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail, generateVerificationToken } from "@/lib/email";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-Mail-Adresse ist erforderlich" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const rateLimitResult = rateLimit(`forgot-password:${normalizedEmail}`, 3, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut." },
        { status: 429 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Falls ein Konto mit dieser E-Mail existiert, wird ein Link zum Zurücksetzen gesendet.",
      });
    }

    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, `password-reset:${user.email}`));

    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(verificationTokens).values({
      identifier: `password-reset:${user.email}`,
      token,
      expires,
    });

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name || '',
      token,
    });

    return NextResponse.json({
      success: true,
      message: "Falls ein Konto mit dieser E-Mail existiert, wird ein Link zum Zurücksetzen gesendet.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
