import type { Language } from "@/lib/sklyvo/i18n";

export type AuthErrorKey =
  | "requiredCredentials"
  | "invalidCredentials"
  | "rateLimited"
  | "rateLimitedRegister"
  | "rateLimitedReset"
  | "accountDisabled"
  | "emailAlreadyRegistered"
  | "passwordTooShort"
  | "newPasswordTooShort"
  | "emailRequired"
  | "invalidEmail"
  | "emailNotRegistered"
  | "missingResetToken"
  | "invalidResetLink"
  | "resetLinkExpired"
  | "loginFailed"
  | "registerFailed"
  | "resetSendFailed"
  | "resetFailed"
  | "passwordsMismatch"
  | "passwordChanged"
  | "totpCodeRequired"
  | "verifyFailed"
  | "passkeyCancelled"
  | "passkeyFailed"
  | "twoFactorExpired"
  | "totpInactive"
  | "invalidTotp"
  | "passkeyChallengeExpired"
  | "invalidPasskeyChallenge"
  | "unknownPasskey"
  | "noPasskey"
  | "passkeyVerifyFailed"
  | "oauthExchange"
  | "oauthUser"
  | "oauthCallback"
  | "oauthProvider"
  | "oauthEmail";

type AuthErrorMessages = Record<AuthErrorKey, string>;

const cs: AuthErrorMessages = {
  requiredCredentials: "E-mail a heslo jsou povinné.",
  invalidCredentials: "Neplatné přihlašovací údaje.",
  rateLimited: "Příliš mnoho pokusů. Zkuste to za chvíli.",
  rateLimitedRegister: "Příliš mnoho registrací. Zkuste to později.",
  rateLimitedReset: "Příliš mnoho požadavků. Zkuste to později.",
  accountDisabled: "Tento účet byl deaktivován. Kontaktujte podporu.",
  emailAlreadyRegistered: "Tento e-mail už je pravděpodobně zaregistrovaný.",
  passwordTooShort: "Heslo musí mít alespoň 8 znaků.",
  newPasswordTooShort: "Nové heslo musí mít alespoň 8 znaků.",
  emailRequired: "Vyplňte e-mailovou adresu.",
  invalidEmail: "Zadejte platnou e-mailovou adresu.",
  emailNotRegistered: "Tento e-mail u nás není registrován.",
  missingResetToken: "Chybí ověřovací token. Vyžádejte si nový odkaz.",
  invalidResetLink: "Neplatný nebo již použitý odkaz pro obnovu hesla.",
  resetLinkExpired: "Platnost odkazu vypršela. Vyžádejte si nový.",
  loginFailed: "Přihlášení se nepodařilo. Zkuste to prosím znovu.",
  registerFailed: "Registrace se nepodařila. Zkuste to prosím znovu.",
  resetSendFailed: "Při odesílání e-mailu nastala chyba. Zkuste to později.",
  resetFailed: "Nepodařilo se změnit heslo. Zkuste to znovu.",
  passwordsMismatch: "Hesla se neshodují.",
  passwordChanged: "Heslo bylo změněno. Přesměrováváme na přihlášení…",
  totpCodeRequired: "Zadejte 6místný kód z authenticatoru.",
  verifyFailed: "Ověření se nepodařilo. Zkuste to znovu.",
  passkeyCancelled: "Ověření passkey bylo zrušeno.",
  passkeyFailed: "Ověření passkey se nepodařilo.",
  twoFactorExpired: "Vypršela dvoufázová výzva. Přihlaste se znovu.",
  totpInactive: "Authenticator není u tomto účtu aktivní.",
  invalidTotp: "Neplatný ověřovací kód.",
  passkeyChallengeExpired: "Vypršela výzva pro passkey. Zkuste to znovu.",
  invalidPasskeyChallenge: "Neplatná výzva pro passkey.",
  unknownPasskey: "Neznámý passkey.",
  noPasskey: "Účet nemá žádný passkey.",
  passkeyVerifyFailed: "Ověření passkey selhalo.",
  oauthExchange: "Sociální přihlášení se nepodařilo dokončit. Zkuste to znovu.",
  oauthUser:
    "Nepodařilo se načíst údaje z poskytovatele. Zkuste to prosím znovu.",
  oauthCallback: "Chybí autorizační kód. Zkuste přihlášení znovu.",
  oauthProvider: "Poskytovatel přihlášení požadavek odmítl. Zkuste to znovu.",
  oauthEmail:
    "Poskytovatel nevrátil e-mail. V Supabase zapni „Allow users without an email“ a zkus to znovu.",
};

const en: AuthErrorMessages = {
  requiredCredentials: "Email and password are required.",
  invalidCredentials: "Invalid login credentials.",
  rateLimited: "Too many attempts. Please try again shortly.",
  rateLimitedRegister: "Too many registrations. Please try again later.",
  rateLimitedReset: "Too many requests. Please try again later.",
  accountDisabled: "This account has been deactivated. Contact support.",
  emailAlreadyRegistered: "This email is probably already registered.",
  passwordTooShort: "Password must be at least 8 characters.",
  newPasswordTooShort: "New password must be at least 8 characters.",
  emailRequired: "Please enter your email address.",
  invalidEmail: "Enter a valid email address.",
  emailNotRegistered: "This email is not registered with us.",
  missingResetToken: "Missing verification token. Request a new link.",
  invalidResetLink: "Invalid or already used password reset link.",
  resetLinkExpired: "This link has expired. Request a new one.",
  loginFailed: "Sign-in failed. Please try again.",
  registerFailed: "Registration failed. Please try again.",
  resetSendFailed: "Could not send the email. Please try again later.",
  resetFailed: "Could not change the password. Please try again.",
  passwordsMismatch: "Passwords do not match.",
  passwordChanged: "Password updated. Redirecting to sign in…",
  totpCodeRequired: "Enter the 6-digit code from your authenticator.",
  verifyFailed: "Verification failed. Please try again.",
  passkeyCancelled: "Passkey verification was cancelled.",
  passkeyFailed: "Passkey verification failed.",
  twoFactorExpired: "Two-factor challenge expired. Sign in again.",
  totpInactive: "Authenticator is not active on this account.",
  invalidTotp: "Invalid verification code.",
  passkeyChallengeExpired: "Passkey challenge expired. Please try again.",
  invalidPasskeyChallenge: "Invalid passkey challenge.",
  unknownPasskey: "Unknown passkey.",
  noPasskey: "This account has no passkey.",
  passkeyVerifyFailed: "Passkey verification failed.",
  oauthExchange: "Social sign-in could not be completed. Please try again.",
  oauthUser: "Could not load provider profile. Please try again.",
  oauthCallback: "Missing authorization code. Try signing in again.",
  oauthProvider: "The sign-in provider rejected the request. Try again.",
  oauthEmail:
    "The provider did not return an email. Enable “Allow users without an email” in Supabase and try again.",
};

const de: AuthErrorMessages = {
  requiredCredentials: "E-Mail und Passwort sind erforderlich.",
  invalidCredentials: "Ungültige Anmeldedaten.",
  rateLimited: "Zu viele Versuche. Bitte versuchen Sie es gleich erneut.",
  rateLimitedRegister: "Zu viele Registrierungen. Bitte später erneut versuchen.",
  rateLimitedReset: "Zu viele Anfragen. Bitte später erneut versuchen.",
  accountDisabled:
    "Dieses Konto wurde deaktiviert. Kontaktieren Sie den Support.",
  emailAlreadyRegistered: "Diese E-Mail ist vermutlich bereits registriert.",
  passwordTooShort: "Das Passwort muss mindestens 8 Zeichen haben.",
  newPasswordTooShort: "Das neue Passwort muss mindestens 8 Zeichen haben.",
  emailRequired: "Bitte geben Sie Ihre E-Mail-Adresse ein.",
  invalidEmail: "Geben Sie eine gültige E-Mail-Adresse ein.",
  emailNotRegistered: "Diese E-Mail ist bei uns nicht registriert.",
  missingResetToken: "Verifizierungstoken fehlt. Fordern Sie einen neuen Link an.",
  invalidResetLink: "Ungültiger oder bereits verwendeter Reset-Link.",
  resetLinkExpired: "Dieser Link ist abgelaufen. Fordern Sie einen neuen an.",
  loginFailed: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
  registerFailed: "Registrierung fehlgeschlagen. Bitte erneut versuchen.",
  resetSendFailed: "E-Mail konnte nicht gesendet werden. Bitte später erneut.",
  resetFailed: "Passwort konnte nicht geändert werden. Bitte erneut versuchen.",
  passwordsMismatch: "Passwörter stimmen nicht überein.",
  passwordChanged: "Passwort geändert. Weiterleitung zur Anmeldung…",
  totpCodeRequired: "Geben Sie den 6-stelligen Code aus dem Authenticator ein.",
  verifyFailed: "Überprüfung fehlgeschlagen. Bitte erneut versuchen.",
  passkeyCancelled: "Passkey-Überprüfung wurde abgebrochen.",
  passkeyFailed: "Passkey-Überprüfung fehlgeschlagen.",
  twoFactorExpired: "Zwei-Faktor-Herausforderung abgelaufen. Neu anmelden.",
  totpInactive: "Authenticator ist bei diesem Konto nicht aktiv.",
  invalidTotp: "Ungültiger Bestätigungscode.",
  passkeyChallengeExpired:
    "Passkey-Herausforderung abgelaufen. Bitte erneut versuchen.",
  invalidPasskeyChallenge: "Ungültige Passkey-Herausforderung.",
  unknownPasskey: "Unbekannter Passkey.",
  noPasskey: "Dieses Konto hat keinen Passkey.",
  passkeyVerifyFailed: "Passkey-Überprüfung fehlgeschlagen.",
  oauthExchange:
    "Soziale Anmeldung konnte nicht abgeschlossen werden. Bitte erneut.",
  oauthUser: "Profil vom Anbieter konnte nicht geladen werden. Bitte erneut.",
  oauthCallback: "Autorisierungscode fehlt. Bitte erneut anmelden.",
  oauthProvider: "Der Anmeldeanbieter hat die Anfrage abgelehnt. Bitte erneut.",
  oauthEmail:
    "Der Anbieter hat keine E-Mail zurückgegeben. Aktivieren Sie in Supabase „Allow users without an email“ und versuchen Sie es erneut.",
};

const es: AuthErrorMessages = {
  requiredCredentials: "El email y la contraseña son obligatorios.",
  invalidCredentials: "Credenciales de acceso no válidas.",
  rateLimited: "Demasiados intentos. Inténtalo de nuevo en un momento.",
  rateLimitedRegister: "Demasiados registros. Inténtalo más tarde.",
  rateLimitedReset: "Demasiadas solicitudes. Inténtalo más tarde.",
  accountDisabled: "Esta cuenta fue desactivada. Contacta con soporte.",
  emailAlreadyRegistered: "Este email probablemente ya está registrado.",
  passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
  newPasswordTooShort: "La nueva contraseña debe tener al menos 8 caracteres.",
  emailRequired: "Introduce tu dirección de email.",
  invalidEmail: "Introduce una dirección de email válida.",
  emailNotRegistered: "Este email no está registrado con nosotros.",
  missingResetToken: "Falta el token de verificación. Solicita un enlace nuevo.",
  invalidResetLink: "Enlace de restablecimiento no válido o ya usado.",
  resetLinkExpired: "Este enlace ha caducado. Solicita uno nuevo.",
  loginFailed: "No se pudo iniciar sesión. Inténtalo de nuevo.",
  registerFailed: "No se pudo registrar. Inténtalo de nuevo.",
  resetSendFailed: "No se pudo enviar el email. Inténtalo más tarde.",
  resetFailed: "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
  passwordsMismatch: "Las contraseñas no coinciden.",
  passwordChanged: "Contraseña actualizada. Redirigiendo al inicio de sesión…",
  totpCodeRequired: "Introduce el código de 6 dígitos del autenticador.",
  verifyFailed: "La verificación falló. Inténtalo de nuevo.",
  passkeyCancelled: "Se canceló la verificación del passkey.",
  passkeyFailed: "Falló la verificación del passkey.",
  twoFactorExpired: "El desafío 2FA caducó. Vuelve a iniciar sesión.",
  totpInactive: "El autenticador no está activo en esta cuenta.",
  invalidTotp: "Código de verificación no válido.",
  passkeyChallengeExpired: "El desafío del passkey caducó. Inténtalo de nuevo.",
  invalidPasskeyChallenge: "Desafío de passkey no válido.",
  unknownPasskey: "Passkey desconocido.",
  noPasskey: "Esta cuenta no tiene passkey.",
  passkeyVerifyFailed: "Falló la verificación del passkey.",
  oauthExchange: "No se pudo completar el inicio social. Inténtalo de nuevo.",
  oauthUser: "No se pudo cargar el perfil del proveedor. Inténtalo de nuevo.",
  oauthCallback: "Falta el código de autorización. Vuelve a iniciar sesión.",
  oauthProvider: "El proveedor rechazó la solicitud. Inténtalo de nuevo.",
  oauthEmail:
    "El proveedor no devolvió un email. Activa “Allow users without an email” en Supabase e inténtalo de nuevo.",
};

export const authErrorsByLanguage: Record<Language, AuthErrorMessages> = {
  cs,
  en,
  de,
  es,
};

/** Map legacy Czech server messages → keys (until actions return codes). */
const FROM_CZECH: Record<string, AuthErrorKey> = {
  "E-mail a heslo jsou povinné.": "requiredCredentials",
  "Neplatné přihlašovací údaje.": "invalidCredentials",
  "Příliš mnoho pokusů. Zkuste to za chvíli.": "rateLimited",
  "Příliš mnoho registrací. Zkuste to později.": "rateLimitedRegister",
  "Příliš mnoho požadavků. Zkuste to později.": "rateLimitedReset",
  "Tento účet byl deaktivován. Kontaktujte podporu.": "accountDisabled",
  "Tento e-mail už je pravděpodobně zaregistrovaný.": "emailAlreadyRegistered",
  "Heslo musí mít alespoň 8 znaků.": "passwordTooShort",
  "Nové heslo musí mít alespoň 8 znaků.": "newPasswordTooShort",
  "Vyplňte e-mailovou adresu.": "emailRequired",
  "Zadejte platnou e-mailovou adresu.": "invalidEmail",
  "Tento e-mail u nás není registrován.": "emailNotRegistered",
  "Chybí ověřovací token.": "missingResetToken",
  "Chybí ověřovací token. Vyžádejte si nový odkaz.": "missingResetToken",
  "Neplatný nebo již použitý odkaz pro obnovu hesla.": "invalidResetLink",
  "Platnost odkazu vypršela. Vyžádejte si nový.": "resetLinkExpired",
  "Vypršela dvoufázová výzva. Přihlaste se znovu.": "twoFactorExpired",
  "Authenticator není u tomto účtu aktivní.": "totpInactive",
  "Neplatný ověřovací kód.": "invalidTotp",
  "Vypršela výzva pro passkey. Zkuste to znovu.": "passkeyChallengeExpired",
  "Neplatná výzva pro passkey.": "invalidPasskeyChallenge",
  "Neznámý passkey.": "unknownPasskey",
  "Účet nemá žádný passkey.": "noPasskey",
  "Ověření passkey selhalo.": "passkeyVerifyFailed",
};

const OAUTH_KEYS: Record<string, AuthErrorKey> = {
  exchange: "oauthExchange",
  user: "oauthUser",
  callback: "oauthCallback",
  provider: "oauthProvider",
  email: "oauthEmail",
};

export function authError(
  language: Language,
  key: AuthErrorKey,
): string {
  return authErrorsByLanguage[language][key];
}

export function localizeAuthError(
  language: Language,
  message: string | null | undefined,
): string {
  if (!message) return "";
  const key = FROM_CZECH[message];
  if (key) return authErrorsByLanguage[language][key];
  return message;
}

export function oauthAuthError(
  language: Language,
  code: string,
): string | null {
  const key = OAUTH_KEYS[code];
  return key ? authErrorsByLanguage[language][key] : null;
}
