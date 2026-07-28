const EMAIL_REGEX = /[\w.+-]+@[\w.-]+\.\w+/gi;
const PHONE_REGEX = /\+?\d[\d\s]{8,15}/g;
const DOMAIN_REGEX =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;

function uniqueTokens(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

/** Rozloží jeden řádek s webem, telefonem a e-mailem na více řádků. */
export function normalizeContactSignatureLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  const emails = uniqueTokens([...trimmed.matchAll(EMAIL_REGEX)].map((match) => match[0]));
  const phones = uniqueTokens([...trimmed.matchAll(PHONE_REGEX)].map((match) => match[0].trim()));

  let textWithoutEmails = trimmed;
  for (const email of emails) {
    textWithoutEmails = textWithoutEmails.replace(email, " ");
  }
  const domains = uniqueTokens(
    [...textWithoutEmails.matchAll(DOMAIN_REGEX)].map((match) =>
      match[0].replace(/^https?:\/\//i, "").replace(/^www\./i, ""),
    ),
  );

  const contactCount = emails.length + phones.length + domains.length;
  if (contactCount < 2) {
    return line;
  }

  let remainder = trimmed;
  for (const token of [...emails, ...phones, ...domains, ...domains.map((d) => `www.${d}`)]) {
    remainder = remainder.replace(token, " ");
  }
  remainder = remainder.replace(/\s{2,}/g, " ").trim();

  const stacked = [
    ...(remainder ? [remainder] : []),
    ...domains,
    ...phones,
    ...emails,
  ];

  return stacked.join("\n");
}

function normalizeEmailPlainText(text: string): string {
  return text
    .split("\n")
    .map((line) => normalizeContactSignatureLine(line))
    .join("\n");
}

/** Připojí uložený podpis, pokud v těle e-mailu ještě není. */
export function appendEmailSignatureIfMissing(body: string, signature: string): string {
  const normalizedBody = body.trim();
  const trimmedSignature = signature.trim();
  if (!normalizedBody || !trimmedSignature) {
    return normalizedBody;
  }

  const signatureLines = trimmedSignature
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bodyComparable = normalizedBody.replace(/\s+/g, " ").toLowerCase();
  const signatureAlreadyPresent = signatureLines.every((line) =>
    bodyComparable.includes(line.replace(/\s+/g, " ").toLowerCase()),
  );

  if (signatureAlreadyPresent) {
    return normalizedBody;
  }

  return `${normalizedBody}\n\n${trimmedSignature}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Převede prosté textové tělo e-mailu na HTML se správně skládaným podpisem. */
export function plainTextToHtml(text: string): string {
  const normalized = normalizeEmailPlainText(text);
  const paragraphs = normalized.split(/\n{2,}/);

  const htmlParagraphs = paragraphs.map((paragraph, index) => {
    const lines = paragraph.split("\n").map((line) => escapeHtml(line.trim())).filter(Boolean);
    const isLikelySignature = index === paragraphs.length - 1 && lines.length >= 2;

    if (isLikelySignature) {
      const salutationPattern = /^(s\s+úctou|s\s+pozdravem|s\s+přátelským\s+pozdravem)/i;
      let nameLine = lines[0];
      let contactLines = lines.slice(1);

      if (salutationPattern.test(nameLine) && lines.length > 2) {
        const salutationHtml = `<p style="margin: 0 0 14px; line-height: 1.6;">${escapeHtml(nameLine)}</p>`;
        nameLine = lines[1];
        contactLines = lines.slice(2);
        const contactHtml = contactLines
          .map(
            (line) =>
              `<div style="margin: 2px 0 0; padding: 0; line-height: 1.5; white-space: nowrap;">${line}</div>`,
          )
          .join("");

        return `${salutationHtml}<div style="margin: 16px 0 0; padding: 0; color: #374151; font-size: 14px; line-height: 1.5;">
        <div style="margin: 0 0 6px; font-weight: 600; color: #111827; white-space: nowrap;">${nameLine}</div>
        ${contactHtml}
      </div>`;
      }

      const contactHtml = contactLines
        .map(
          (line) =>
            `<div style="margin: 2px 0 0; padding: 0; line-height: 1.5; white-space: nowrap;">${line}</div>`,
        )
        .join("");

      return `<div style="margin: 16px 0 0; padding: 0; color: #374151; font-size: 14px; line-height: 1.5;">
        <div style="margin: 0 0 6px; font-weight: 600; color: #111827; white-space: nowrap;">${nameLine}</div>
        ${contactHtml}
      </div>`;
    }

    return `<p style="margin: 0 0 14px; line-height: 1.6;">${lines.join("<br />")}</p>`;
  });

  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937;">${htmlParagraphs.join("")}</div>`;
}

/** Pro nodemailer multipart/alternative — čistý text bez HTML. */
export function plainTextToMimeText(text: string): string {
  return normalizeEmailPlainText(text);
}

/** Převede uložené HTML tělo e-mailu na prostý text pro úpravu v editoru. */
export function htmlBodyToEditablePlainText(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*line-height:\s*1\.5[^>]*>/gi, "\n")
    .replace(/<\/div>\s*<div[^>]*font-weight:\s*600[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalizeEmailPlainText(text);
}

export function htmlToPlainText(html: string): string {
  return htmlBodyToEditablePlainText(html);
}

/** Prostý text z generátoru → HTML fragment pro rich editor. */
export function plainTextToEditorHtml(text: string): string {
  const normalized = normalizeEmailPlainText(text).trim();
  if (!normalized) return "";
  return escapeHtml(normalized).replace(/\n/g, "<br>");
}

const ALLOWED_RICH_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "div",
  "span",
  "ul",
  "ol",
  "li",
]);

/** Odstraní nebezpečné tagy/atributy z HTML z editoru před odesláním. */
export function sanitizeEmailRichHtml(html: string): string {
  let out = html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed)\b[^>]*>/gi, "");

  out = out.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    const isClosing = match.startsWith("</");
    if (!ALLOWED_RICH_TAGS.has(tag)) {
      return "";
    }
    if (tag === "br") {
      return isClosing ? "" : "<br>";
    }
    return isClosing ? `</${tag}>` : `<${tag}>`;
  });

  return out;
}

/** HTML z editoru zabalí do e-mailové šablony (multipart HTML část). */
export function richHtmlToEmailHtml(html: string): string {
  const clean = sanitizeEmailRichHtml(html).trim();
  if (!clean) {
    return plainTextToHtml("");
  }
  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937;">${clean}</div>`;
}
