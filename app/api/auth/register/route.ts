import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { validateEmail, validatePassword, validateName } from "@/lib/validation";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { sendVerificationEmail, generateVerificationToken } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`register:${ip}`, 5, 60000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte warten Sie einen Moment." },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimitResult.resetIn / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { 
          error: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail.",
          code: "EMAIL_EXISTS"
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const sanitizedName = name ? name.trim().slice(0, 100) : email.split("@")[0];
    const normalizedEmail = email.toLowerCase().trim();

    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        password: hashedPassword,
        name: sanitizedName,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(verificationTokens).values({
      identifier: normalizedEmail,
      token,
      expires,
    });

    try {
      await sendVerificationEmail({
        email: normalizedEmail,
        name: sanitizedName,
        token,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: "Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mails.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
