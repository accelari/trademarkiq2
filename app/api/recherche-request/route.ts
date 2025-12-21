import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

interface ExtractedData {
  markenname: string;
  produkte_dienstleistungen: string;
  nizza_klassen: string;
  laender: string;
  kunden_email: string;
}

async function extractDataFromConversation(conversation: string): Promise<ExtractedData> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Analysiere dieses Beratungsgespräch und extrahiere die Recherche-Anfrage-Daten. 
Gib die Daten als JSON zurück mit folgenden Feldern:
- markenname: Der gewünschte Markenname (oder "Nicht angegeben")
- produkte_dienstleistungen: Beschreibung der Produkte/Dienstleistungen (oder "Nicht angegeben")
- nizza_klassen: Die genannten Nizza-Klassen (oder "Nicht angegeben")
- laender: Die gewünschten Länder/Regionen (oder "Nicht angegeben")
- kunden_email: Falls eine E-Mail-Adresse genannt wurde (oder "Nicht angegeben")

Antworte NUR mit dem JSON, ohne zusätzlichen Text.

Gespräch:
${conversation}`
    }]
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("JSON parse error:", e);
  }

  return {
    markenname: "Nicht angegeben",
    produkte_dienstleistungen: "Nicht angegeben",
    nizza_klassen: "Nicht angegeben",
    laender: "Nicht angegeben",
    kunden_email: "Nicht angegeben"
  };
}

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
    const { markenname, laender, klassen, conversation, summary, source } = body;
    
    if (conversation && source) {
      const extractedData = await extractDataFromConversation(conversation);
      
      const kundenEmail = session.user.email;
      const kundenName = session.user.name || "Kunde";

      const summarySection = summary ? `
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">📝 Zusammenfassung (KI-geprüft)</h2>
            
            <div style="background: #ecfdf5; border: 1px solid #0D9488; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <div style="font-size: 14px; line-height: 1.8; color: #1f2937; white-space: pre-wrap;">${summary.replace(/\n/g, '<br>')}</div>
            </div>
      ` : '';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0D9488 0%, #0891B2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔍 Neue Recherche-Anfrage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Aus ${source === 'voice' ? 'Sprachberatung (Hume)' : 'Text-Chat (Claude)'}</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
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
              ${extractedData.kunden_email !== "Nicht angegeben" ? `
              <tr>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Kunde wünscht E-Mail an</td>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; color: #0D9488; font-weight: bold;">${extractedData.kunden_email}</td>
              </tr>
              ` : ''}
            </table>
            
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">📋 Extrahierte Recherche-Daten</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold; width: 35%;">Markenname</td>
                <td style="padding: 12px; background: ${extractedData.markenname !== "Nicht angegeben" ? '#ecfdf5' : 'white'}; border: 1px solid #e5e7eb; font-size: 16px; color: #0D9488; font-weight: bold;">${extractedData.markenname}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Produkte / Dienstleistungen</td>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${extractedData.produkte_dienstleistungen}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Nizza-Klassen</td>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${extractedData.nizza_klassen}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Zielländer / Regionen</td>
                <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${extractedData.laender}</td>
              </tr>
            </table>
            
            ${summarySection}
            
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">💬 Gesprächsverlauf</h2>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; max-height: 400px; overflow-y: auto;">
              <pre style="margin: 0; font-family: inherit; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #374151;">${conversation}</pre>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚡ Aktion erforderlich:</strong> Bitte führen Sie die Markenrecherche durch und senden Sie dem Kunden einen detaillierten Bericht.
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
        subject: `🔍 Recherche-Anfrage: ${extractedData.markenname !== "Nicht angegeben" ? extractedData.markenname : "Neue Anfrage"} (${source === 'voice' ? 'Sprache' : 'Text'})`,
        html: emailHtml,
      });

      console.log("Recherche-Anfrage E-Mail gesendet:", result);

      return NextResponse.json({
        success: true,
        message: "Ihre Recherche-Anfrage wurde übermittelt. Wir erstellen Ihren Bericht und melden uns per E-Mail bei Ihnen.",
        extractedData
      });
    }

    if (!markenname?.trim()) {
      return NextResponse.json(
        { error: "Bitte geben Sie einen Markennamen ein" },
        { status: 400 }
      );
    }

    if (!laender || laender.length === 0) {
      return NextResponse.json(
        { error: "Bitte wählen Sie mindestens ein Land/Register aus" },
        { status: 400 }
      );
    }

    const kundenEmail = session.user.email;
    const kundenName = session.user.name || "Kunde";

    const laenderText = laender.join(", ");
    const klassenText = klassen && klassen.length > 0 
      ? klassen.map((k: number) => `Klasse ${k}`).join(", ")
      : "Alle Klassen";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0D9488 0%, #0891B2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Neue Rechercheanfrage</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">TrademarkIQ Dashboard</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Kundendaten</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold; width: 40%;">Name</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${kundenName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">E-Mail</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">
                <a href="mailto:${kundenEmail}" style="color: #0D9488;">${kundenEmail}</a>
              </td>
            </tr>
          </table>
          
          <h2 style="color: #1f2937; margin: 30px 0 20px 0; font-size: 18px;">Recherchedetails</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold; width: 40%;">Markenname</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-size: 16px; color: #0D9488; font-weight: bold;">${markenname}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Länder / Register</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${laenderText}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; font-weight: bold;">Nizza-Klassen</td>
              <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">${klassenText}</td>
            </tr>
          </table>
          
          <div style="margin-top: 30px; padding: 20px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #0D9488;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              <strong>Nächster Schritt:</strong> Bitte führen Sie eine gründliche Markenrecherche für den Kunden durch und senden Sie ihm die Ergebnisse per E-Mail.
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
      subject: `Neue Rechercheanfrage: ${markenname}`,
      html: emailHtml,
    });

    console.log("Resend result:", result);

    return NextResponse.json({
      success: true,
      message: "Ihre Anfrage wurde erfolgreich gesendet. Wir melden uns in Kürze bei Ihnen.",
    });

  } catch (error: any) {
    console.error("Recherche request error:", error);
    return NextResponse.json(
      { error: "Fehler beim Senden der Anfrage. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
