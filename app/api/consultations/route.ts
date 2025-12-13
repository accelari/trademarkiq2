import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { consultations, trademarkCases, caseSteps } from "@/db/schema";
import { desc, eq, isNull, and, notInArray } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userConsultations = await db.query.consultations.findMany({
      where: eq(consultations.userId, session.user.id),
      orderBy: [desc(consultations.createdAt)],
      with: {
        case: {
          with: {
            steps: true,
          },
        },
      },
    });

    const consultationsWithCaseData = userConsultations.map((c) => ({
      ...c,
      caseId: c.case?.id || null,
      caseNumber: c.case?.caseNumber || null,
      trademarkName: c.case?.trademarkName || null,
      countries: (c.extractedData as any)?.countries || [],
      niceClasses: (c.extractedData as any)?.niceClasses || [],
      caseSteps: c.case?.steps?.map((step) => ({
        step: step.step,
        status: step.status,
        completedAt: step.completedAt,
        skippedAt: step.skippedAt,
        skipReason: step.skipReason,
        metadata: step.metadata || {},
      })) || [],
    }));

    const caseIdsWithConsultations = userConsultations
      .filter((c) => c.caseId)
      .map((c) => c.caseId as string);

    const standaloneCases = await db.query.trademarkCases.findMany({
      where: caseIdsWithConsultations.length > 0
        ? and(
            eq(trademarkCases.userId, session.user.id),
            notInArray(trademarkCases.id, caseIdsWithConsultations)
          )
        : eq(trademarkCases.userId, session.user.id),
      orderBy: [desc(trademarkCases.createdAt)],
      with: {
        steps: true,
        events: true,
      },
    });

    const standaloneCasesAsPseudoConsultations = standaloneCases.map((c) => {
      const searchData = (c.events?.find((e: any) => e.eventType === "created")?.eventData as any)?.searchData;
      return {
        id: `case-${c.id}`,
        userId: c.userId,
        title: c.trademarkName ? `Marke "${c.trademarkName}"` : "Markenrecherche",
        summary: "",
        transcript: null,
        sessionProtocol: null,
        duration: null,
        mode: "recherche",
        status: "completed",
        extractedData: {
          trademarkName: c.trademarkName,
          countries: searchData?.countries || [],
          niceClasses: searchData?.classes || [],
          isComplete: true,
        },
        emailSent: false,
        emailSentAt: null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        caseId: c.id,
        caseNumber: c.caseNumber,
        trademarkName: c.trademarkName,
        countries: searchData?.countries || [],
        niceClasses: searchData?.classes || [],
        caseSteps: c.steps?.map((step) => ({
          step: step.step,
          status: step.status,
          completedAt: step.completedAt,
          skippedAt: step.skippedAt,
          skipReason: step.skipReason,
          metadata: step.metadata || {},
        })) || [],
      };
    });

    const allConsultations = [...consultationsWithCaseData, ...standaloneCasesAsPseudoConsultations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ consultations: allConsultations });
  } catch (error) {
    console.error("Error fetching consultations:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { title, summary, transcript, sessionProtocol, duration, mode, extractedData, sendEmail } = body;

    if (!title || !summary) {
      return NextResponse.json(
        { error: "Titel und Zusammenfassung erforderlich" },
        { status: 400 }
      );
    }

    const isComplete = extractedData?.trademarkName && 
                       extractedData?.countries?.length > 0 && 
                       extractedData?.niceClasses?.length > 0;
    
    const consultationStatus = isComplete ? "ready_for_research" : "draft";

    const [newConsultation] = await db
      .insert(consultations)
      .values({
        userId: session.user.id,
        title,
        summary,
        transcript,
        sessionProtocol,
        duration: duration || 0,
        mode: mode || "text",
        status: consultationStatus,
        extractedData: {
          ...extractedData,
          isComplete,
        },
        emailSent: false,
      })
      .returning();

    if (sendEmail && session.user.email) {
      try {
        const formattedDate = new Date().toLocaleDateString("de-DE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const durationFormatted = duration 
          ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")} Minuten`
          : "Nicht erfasst";

        await resend.emails.send({
          from: "TrademarkIQ <beratung@mail.accelari.com>",
          to: session.user.email,
          subject: `Ihre Markenberatung: ${title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #0D9488, #14b8a6); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 10px 0 0; opacity: 0.9; }
                .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .meta { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .meta-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
                .meta-item:last-child { border-bottom: none; }
                .meta-label { color: #6b7280; }
                .meta-value { font-weight: 600; color: #0D9488; }
                .summary { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0D9488; }
                .summary h2 { margin-top: 0; color: #0D9488; font-size: 18px; }
                .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; }
                .footer a { color: #14b8a6; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>TrademarkIQ Markenberatung</h1>
                  <p>Ihre Beratungszusammenfassung</p>
                </div>
                <div class="content">
                  <div class="meta">
                    <div class="meta-item">
                      <span class="meta-label">Datum</span>
                      <span class="meta-value">${formattedDate}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Dauer</span>
                      <span class="meta-value">${durationFormatted}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Modus</span>
                      <span class="meta-value">${mode === "sprache" ? "Sprachberatung" : "Textberatung"}</span>
                    </div>
                  </div>
                  <div class="summary">
                    <h2>${title}</h2>
                    ${summary.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
                  </div>
                </div>
                <div class="footer">
                  <p>Diese E-Mail wurde automatisch von TrademarkIQ generiert.</p>
                  <p><a href="https://trademarkiq.accelari.com">trademarkiq.accelari.com</a></p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        await db
          .update(consultations)
          .set({ emailSent: true, emailSentAt: new Date() })
          .where(eq(consultations.id, newConsultation.id));

        newConsultation.emailSent = true;
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      consultation: newConsultation,
      emailSent: newConsultation.emailSent,
    });
  } catch (error) {
    console.error("Error creating consultation:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
