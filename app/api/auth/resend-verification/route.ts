import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendVerificationEmail, generateVerificationToken } from "@/lib/email";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`resend-verification:${ip}`, 3, 300000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte warten Sie 5 Minuten." },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimitResult.resetIn / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "E-Mail-Adresse fehlt" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet."
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Ihre E-Mail-Adresse ist bereits verifiziert."
      });
    }

    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, user.email));

    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(verificationTokens).values({
      identifier: user.email,
      token,
      expires,
    });

    await sendVerificationEmail({
      email: user.email,
      name: user.name || '',
      token,
    });

    return NextResponse.json({
      success: true,
      message: "Eine neue Bestätigungs-E-Mail wurde gesendet."
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Fehler beim Senden der Bestätigungs-E-Mail" },
      { status: 500 }
    );
  }
}
