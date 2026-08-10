import {
 SKLYVO_BRAND,
 getAccountSettingsUrl,
 getBrandLogoUrl,
 getHelpUrl,
} from "@/lib/sklyvo-brand";

type EmailCta = {
 label: string;
 href: string;
};

type RenderSystemEmailInput = {
 /** Preheader / preview text in inbox */
 preview?: string;
 title: string;
 /** Inner HTML body (paragraphs, lists, code blocks) — no outer chrome */
 bodyHtml: string;
 cta?: EmailCta;
 /** Show marketing-style prefs link in footer */
 showPrefsLink?: boolean;
};

function escapeHtml(value: string): string {
 return value
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;");
}

/**
 * Professional Sklyvo-branded HTML wrapper for all product e-mails to customers.
 * Do NOT use for outreach to leads (those go via the user's mailbox).
 */
export function renderSystemEmail({
 preview,
 title,
 bodyHtml,
 cta,
 showPrefsLink = false,
}: RenderSystemEmailInput): string {
 const logoUrl = getBrandLogoUrl();
 const brand = SKLYVO_BRAND;
 const previewText = escapeHtml(preview ?? title);
 const safeTitle = escapeHtml(title);

 const addressLine = brand.address
 ? `<br />${escapeHtml(brand.address)}`
 : "";

 const prefsLine = showPrefsLink
 ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${brand.muted};">
 Nastavení upozornění můžete kdykoli změnit v
 <a href="${getAccountSettingsUrl()}" style="color:${brand.brandColor};text-decoration:none;">Můj profil</a>.
 </p>`
 : "";

 const ctaBlock = cta
 ? `<div style="text-align:center;margin:28px 0 8px;">
 <a href="${escapeHtml(cta.href)}"
 style="display:inline-block;background:linear-gradient(180deg,#3bbcff 0%,${brand.brandColor} 48%,${brand.brandColorDark} 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;box-shadow:0 10px 20px -8px rgba(2,167,255,0.45);">
 ${escapeHtml(cta.label)}
 </a>
 </div>`
 : "";

 return `<!DOCTYPE html>
<html lang="cs">
<head>
 <meta charset="utf-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#eef3f8;font-family:Helvetica,Arial,sans-serif;color:${brand.ink};">
 <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
 ${previewText}
 </div>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f8;padding:32px 16px;">
 <tr>
 <td align="center">
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2eaf2;box-shadow:0 18px 40px -20px rgba(30,70,110,0.28);">
 <tr>
 <td style="padding:28px 28px 12px;background:linear-gradient(180deg,#f7fbff 0%,#ffffff 100%);border-bottom:1px solid #eef2f7;">
 <table role="presentation" cellspacing="0" cellpadding="0">
 <tr>
 <td style="vertical-align:middle;padding-right:12px;">
 <img src="${logoUrl}" width="36" height="36" alt="${brand.name}" style="display:block;border-radius:10px;" />
 </td>
 <td style="vertical-align:middle;">
 <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${brand.ink};">${brand.name}</div>
 <div style="font-size:12px;color:${brand.muted};margin-top:2px;">AI outreach &amp; CRM</div>
 </td>
 </tr>
 </table>
 </td>
 </tr>
 <tr>
 <td style="padding:28px;">
 <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:800;letter-spacing:-0.02em;color:${brand.ink};">
 ${safeTitle}
 </h1>
 <div style="font-size:15px;line-height:1.65;color:${brand.ink};">
 ${bodyHtml}
 </div>
 ${ctaBlock}
 </td>
 </tr>
 <tr>
 <td style="padding:20px 28px 28px;background:#f8fafc;border-top:1px solid #eef2f7;">
 <p style="margin:0;font-size:13px;line-height:1.55;color:${brand.muted};">
 <strong style="color:${brand.ink};">${escapeHtml(brand.companyName)}</strong>${addressLine}<br />
 Podpora:
 <a href="mailto:${brand.supportEmail}" style="color:${brand.brandColor};text-decoration:none;">${brand.supportEmail}</a>
 · Tel:
 <a href="tel:${brand.phone.replace(/\s+/g, "")}" style="color:${brand.brandColor};text-decoration:none;">${brand.phone}</a><br />
 Web:
 <a href="${brand.websiteUrl}" style="color:${brand.brandColor};text-decoration:none;">${brand.websiteLabel}</a>
 ·
 <a href="${getHelpUrl()}" style="color:${brand.brandColor};text-decoration:none;">Podpora</a>
 </p>
 ${prefsLine}
 </td>
 </tr>
 </table>
 <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
 © ${new Date().getFullYear()} ${escapeHtml(brand.companyName)}. Všechna práva vyhrazena.
 </p>
 </td>
 </tr>
 </table>
</body>
</html>`;
}

export function emailParagraph(text: string): string {
 return `<p style="margin:0 0 14px;">${text}</p>`;
}

export function emailMuted(text: string): string {
 return `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${SKLYVO_BRAND.muted};">${text}</p>`;
}

export function emailCodeBlock(code: string): string {
 return `<div style="font-size:32px;font-weight:800;letter-spacing:10px;text-align:center;background:#f1f5f9;border-radius:12px;padding:18px 0;margin:8px 0 16px;color:${SKLYVO_BRAND.brandColor};">${escapeHtml(code)}</div>`;
}
