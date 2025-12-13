import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { markenname, laender, klassen, aiAnalysis } = body;
    
    if (!markenname?.trim()) {
      return NextResponse.json(
        { error: "Bitte geben Sie einen Markennamen ein" },
        { status: 400 }
      );
    }

    const kundenEmail = session.user.email;
    const kundenName = session.user.name || "Kunde";

    const laenderText = laender && laender.length > 0 ? laender.join(", ") : "Nicht angegeben";
    const klassenText = klassen && klassen.length > 0 
      ? klassen.map((k: number) => `Klasse ${k}`).join(", ")
      : "Alle Klassen";

    const getRiskEmoji = (risk: string) => {
      switch (risk) {
        case "high": return "🔴";
        case "medium": return "🟡";
        case "low": return "🟢";
        default: return "⚪";
      }
    };

    const getRiskText = (risk: string) => {
      switch (risk) {
        case "high": return "Hohes Risiko";
        case "medium": return "Mittleres Risiko";
        case "low": return "Niedriges Risiko";
        default: return "Unbekannt";
      }
    };

    const aiAnalysisSection = aiAnalysis ? `
      <h2 style="color: #1f2937; margin: 30px 0 20px 0; font-size: 18px;">🤖 KI-Analyse (bereits durchgeführt)</h2>
      
      <div style="background: ${aiAnalysis.analysis?.overallRisk === 'high' ? '#fef2f2' : aiAnalysis.analysis?.overallRisk === 'medium' ? '#fffbeb' : '#ecfdf5'}; border: 1px solid ${aiAnalysis.analysis?.overallRisk === 'high' ? '#fecaca' : aiAnalysis.analysis?.overallRisk === 'medium' ? '#fde68a' : '#a7f3d0'}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: bold; font-size: 16px;">
          ${getRiskEmoji(aiAnalysis.analysis?.overallRisk)} Gesamtrisiko: ${getRiskText(aiAnalysis.analysis?.overallRisk)}
        </p>
        <p style="margin: 8px 0 0 0; color: #4b5563; font-size: 14px;">
          ${aiAnalysis.totalResultsAnalyzed || 0} Marken analysiert • ${aiAnalysis.conflicts?.length || 0} potenzielle Konflikte
        </p>
      </div>
      
      ${aiAnalysis.analysis?.nameAnalysis ? `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: bold;">📝 Namensanalyse</h3>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${aiAnalysis.analysis.nameAnalysis}</p>
      </div>
      ` : ''}
      
      ${aiAnalysis.analysis?.riskAssessment ? `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: bold;">⚠️ Risikobewertung</h3>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${aiAnalysis.analysis.riskAssessment}</p>
      </div>
      ` : ''}
      
      ${aiAnalysis.analysis?.recommendation ? `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: bold;">✨ Empfehlung</h3>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${aiAnalysis.analysis.recommendation}</p>
      </div>
      ` : ''}
      
      ${aiAnalysis.conflicts && aiAnalysis.conflicts.length > 0 ? `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #374151; font-weight: bold;">⚡ Potenzielle Konflikte (${aiAnalysis.conflicts.length})</h3>
        ${aiAnalysis.conflicts.slice(0, 5).map((c: any) => `
          <div style="padding: 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #1f2937;">${c.name}</strong>
              <span style="font-size: 12px; padding: 2px 8px; border-radius: 9999px; background: ${c.riskLevel === 'high' ? '#fef2f2' : c.riskLevel === 'medium' ? '#fffbeb' : '#ecfdf5'}; color: ${c.riskLevel === 'high' ? '#dc2626' : c.riskLevel === 'medium' ? '#d97706' : '#059669'};">
                ${getRiskEmoji(c.riskLevel)} ${c.accuracy}%
              </span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">${c.holder} • ${c.register} • Klassen: ${c.classes?.join(', ') || '-'}</p>
          </div>
        `).join('')}
        ${aiAnalysis.conflicts.length > 5 ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #6b7280; text-align: center;">... und ${aiAnalysis.conflicts.length - 5} weitere</p>` : ''}
      </div>
      ` : ''}
    ` : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0D9488 0%, #0891B2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">👨‍⚖️ Neue Experten-Anfrage</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Ein Kunde möchte mit einem Markenrechtsexperten sprechen</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">👤 Kundendaten</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold; width: 35%;">Name</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${kundenName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">E-Mail</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">
                <a href="mailto:${kundenEmail}" style="color: #0D9488;">${kundenEmail}</a>
              </td>
            </tr>
          </table>
          
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">📋 Recherche-Daten</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold; width: 35%;">Markenname</td>
              <td style="padding: 12px; background: #ecfdf5; border: 1px solid #e5e7eb; font-size: 18px; color: #0D9488; font-weight: bold;">${markenname}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Zielländer / Register</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${laenderText}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Nizza-Klassen</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${klassenText}</td>
            </tr>
          </table>
          
          ${aiAnalysisSection}
          
          <div style="margin-top: 30px; padding: 20px; background: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>📞 Aktion erforderlich:</strong> Bitte kontaktieren Sie den Kunden zeitnah, um einen Beratungstermin zu vereinbaren.
            </p>
          </div>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">
          Diese E-Mail wurde automatisch von TrademarkIQ generiert.
        </p>
      </div>
    `;

    const result = await resend.emails.send({
      from: "TrademarkIQ <noreply@mail.accelari.com>",
      to: "info@accelari.com",
      replyTo: kundenEmail,
      subject: `👨‍⚖️ Experten-Anfrage: ${markenname}`,
      html: emailHtml,
    });

    console.log("Experten-Anfrage E-Mail gesendet:", result);

    return NextResponse.json({
      success: true,
      message: "Ihre Anfrage wurde erfolgreich gesendet. Ein Experte wird sich in Kürze bei Ihnen melden.",
    });

  } catch (error: any) {
    console.error("Expert request error:", error);
    return NextResponse.json(
      { error: "Fehler beim Senden der Anfrage. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
