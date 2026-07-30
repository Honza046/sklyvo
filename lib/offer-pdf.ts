import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type OfferDocumentType = "offer" | "contract";

export type OfferGeneratorInput = {
  type: OfferDocumentType;
  clientName: string;
  clientCompany: string;
  subject: string;
  description: string;
  amount: string;
  currency: string;
  validUntil: string;
  paymentTerms: string;
  notes: string;
  issuerName: string;
  issuerCompany: string;
};

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function buildOfferOrContractPdf(
  input: OfferGeneratorInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  let y = 780;

  const title = input.type === "contract" ? "SMLOUVA" : "NABÍDKA";
  page.drawText(title, {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.45),
  });
  y -= 28;

  page.drawText(input.subject || "Bez názvu", {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 36;

  const metaRows: [string, string][] = [
    ["Dodavatel", input.issuerCompany || input.issuerName || "—"],
    ["Kontakt", input.issuerName || "—"],
    ["Klient", input.clientCompany || input.clientName || "—"],
    ["Kontakt klienta", input.clientName || "—"],
    ["Částka", `${input.amount || "—"} ${input.currency || "CZK"}`.trim()],
    ["Platnost do", input.validUntil || "—"],
    ["Splatnost", input.paymentTerms || "—"],
  ];

  for (const [label, value] of metaRows) {
    page.drawText(`${label}:`, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.35, 0.35, 0.35),
    });
    page.drawText(value.slice(0, 70), {
      x: margin + 110,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 18;
  }

  y -= 12;
  page.drawText(
    input.type === "contract" ? "Předmět smlouvy" : "Popis nabídky",
    {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    },
  );
  y -= 18;

  const bodyLines = wrapText(input.description || "—", 85);
  for (const line of bodyLines.slice(0, 18)) {
    page.drawText(line, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 14;
  }

  if (input.notes?.trim()) {
    y -= 10;
    page.drawText("Poznámky / podmínky", {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 18;
    for (const line of wrapText(input.notes, 85).slice(0, 10)) {
      page.drawText(line, {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.12, 0.12, 0.12),
      });
      y -= 14;
    }
  }

  page.drawText(
    "Vygenerováno ve Venegard · dokument slouží jako pracovní podklad.",
    {
      x: margin,
      y: 48,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    },
  );

  return pdf.save();
}
