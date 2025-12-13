import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`check-verification:${ip}`, 10, 60000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { needsVerification: false },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ needsVerification: false });
    }

    const [user] = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return NextResponse.json({ needsVerification: false });
    }

    return NextResponse.json({ 
      needsVerification: !user.emailVerified 
    });
  } catch (error) {
    console.error("Check verification error:", error);
    return NextResponse.json({ needsVerification: false });
  }
}
