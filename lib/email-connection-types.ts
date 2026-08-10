export type EmailConnectionProviderType = "GOOGLE" | "OUTLOOK_SMTP" | "CUSTOM_SMTP";

export type EmailConnectionStatusType = "DISCONNECTED" | "CONNECTED" | "ERROR";

export type EmailConnectionState = {
 connected: boolean;
 provider: EmailConnectionProviderType | null;
 status: EmailConnectionStatusType;
 senderName: string | null;
 senderEmail: string | null;
 smtpHost: string | null;
 smtpPort: number | null;
 hasSmtpSecret: boolean;
 connectedAt: string | null;
 lastError: string | null;
 /** Osobní schránka uživatele, nebo sdílený fallback workspace. */
 scope: "user" | "workspace" | null;
 /** Předvyplnění formuláře (jméno / login e-mail). */
 suggestedSenderName: string | null;
 suggestedSenderEmail: string | null;
};

export type SaveSmtpConnectionInput = {
 provider: "OUTLOOK_SMTP" | "CUSTOM_SMTP";
 senderName: string;
 senderEmail: string;
 smtpHost: string;
 smtpPort: number;
 appPassword: string;
};
