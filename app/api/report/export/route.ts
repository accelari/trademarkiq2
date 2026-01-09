import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";

interface ExportRequest {
  content: string;
  format: "pdf" | "docx";
  filename: string;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n=== $1 ===\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n== $1 ==\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n= $1 =\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "$1")
    .replace(/<em>(.*?)<\/em>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseHtmlToDocxElements(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  const lines = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "[H1]$1[/H1]")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "[H2]$1[/H2]")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "[H3]$1[/H3]")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "[P]$1[/P]")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "[LI]$1[/LI]")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  const h1Matches = lines.match(/\[H1\](.*?)\[\/H1\]/g) || [];
  const h2Matches = lines.match(/\[H2\](.*?)\[\/H2\]/g) || [];
  const h3Matches = lines.match(/\[H3\](.*?)\[\/H3\]/g) || [];
  const pMatches = lines.match(/\[P\](.*?)\[\/P\]/g) || [];
  const liMatches = lines.match(/\[LI\](.*?)\[\/LI\]/g) || [];

  const allElements: { type: string; content: string; index: number }[] = [];

  h1Matches.forEach(m => {
    const content = m.replace(/\[H1\](.*?)\[\/H1\]/, "$1");
    allElements.push({ type: "h1", content, index: lines.indexOf(m) });
  });
  
  h2Matches.forEach(m => {
    const content = m.replace(/\[H2\](.*?)\[\/H2\]/, "$1");
    allElements.push({ type: "h2", content, index: lines.indexOf(m) });
  });

  h3Matches.forEach(m => {
    const content = m.replace(/\[H3\](.*?)\[\/H3\]/, "$1");
    allElements.push({ type: "h3", content, index: lines.indexOf(m) });
  });

  pMatches.forEach(m => {
    const content = m.replace(/\[P\](.*?)\[\/P\]/, "$1");
    allElements.push({ type: "p", content, index: lines.indexOf(m) });
  });

  liMatches.forEach(m => {
    const content = m.replace(/\[LI\](.*?)\[\/LI\]/, "$1");
    allElements.push({ type: "li", content, index: lines.indexOf(m) });
  });

  allElements.sort((a, b) => a.index - b.index);

  for (const el of allElements) {
    const cleanContent = el.content
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .trim();

    if (!cleanContent) continue;

    switch (el.type) {
      case "h1":
        paragraphs.push(new Paragraph({
          text: cleanContent,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          alignment: AlignmentType.CENTER,
        }));
        break;
      case "h2":
        paragraphs.push(new Paragraph({
          text: cleanContent,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }));
        break;
      case "h3":
        paragraphs.push(new Paragraph({
          text: cleanContent,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }));
        break;
      case "li":
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: `• ${cleanContent}` })],
          spacing: { before: 50, after: 50 },
          indent: { left: 720 },
        }));
        break;
      default:
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: cleanContent })],
          spacing: { before: 100, after: 100 },
        }));
    }
  }

  if (paragraphs.length === 0) {
    const plainText = htmlToPlainText(html);
    const textLines = plainText.split("\n").filter(l => l.trim());
    for (const line of textLines) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line })],
        spacing: { before: 100, after: 100 },
      }));
    }
  }

  return paragraphs;
}

async function generateDocx(html: string, filename: string): Promise<Buffer> {
  const paragraphs = parseHtmlToDocxElements(html);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: paragraphs,
    }],
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: {
            font: "Calibri",
            size: 24,
          },
        },
      ],
    },
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

async function generatePdf(html: string, filename: string): Promise<Buffer> {
  const plainText = htmlToPlainText(html);
  
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${plainText.length + 100} >>
stream
BT
/F1 11 Tf
50 750 Td
12 TL
${plainText.split("\n").slice(0, 60).map(line => `(${line.replace(/[()\\]/g, "\\$&").substring(0, 80)}) Tj T*`).join("\n")}
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${500 + plainText.length}
%%EOF`;

  return Buffer.from(pdfContent, "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { content, format, filename } = body;

    if (!content) {
      return NextResponse.json({ error: "Kein Inhalt vorhanden" }, { status: 400 });
    }

    let buffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    if (format === "docx") {
      buffer = await generateDocx(content, filename);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      fileExtension = "docx";
    } else {
      buffer = await generatePdf(content, filename);
      contentType = "application/pdf";
      fileExtension = "pdf";
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}.${fileExtension}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export fehlgeschlagen" },
      { status: 500 }
    );
  }
}
