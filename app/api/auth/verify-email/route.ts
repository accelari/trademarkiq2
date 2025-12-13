import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Verifizierungs-Token fehlt" },
        { status: 400 }
      );
    }

    const [verificationRecord] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          gt(verificationTokens.expires, new Date())
        )
      )
      .limit(1);

    if (!verificationRecord) {
      return NextResponse.json(
        { error: "Ungültiger oder abgelaufener Token" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ 
        emailVerified: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.email, verificationRecord.identifier));

    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, verificationRecord.identifier),
          eq(verificationTokens.token, token)
        )
      );

    return NextResponse.json({
      success: true,
      message: "E-Mail erfolgreich verifiziert"
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verifizierung fehlgeschlagen" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Verifizierungs-Token fehlt" },
        { status: 400 }
      );
    }

    const [verificationRecord] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          gt(verificationTokens.expires, new Date())
        )
      )
      .limit(1);

    if (!verificationRecord) {
      return NextResponse.json(
        { error: "Ungültiger oder abgelaufener Token" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ 
        emailVerified: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.email, verificationRecord.identifier));

    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, verificationRecord.identifier),
          eq(verificationTokens.token, token)
        )
      );

    return NextResponse.json({
      success: true,
      message: "E-Mail erfolgreich verifiziert"
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verifizierung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
