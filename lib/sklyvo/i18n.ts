export const LANGUAGES = ["cs", "en", "de", "es"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "cs";

type AuthCopy = {
  email: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  or: string;
  globeTitle: string;
  globeBody: string;
};

export type Dictionary = {
  login: AuthCopy & {
    title: string;
    sub: string;
    forgot: string;
    cta: string;
    noAccount: string;
    signUp: string;
  };
  register: AuthCopy & {
    title: string;
    sub: string;
    name: string;
    cta: string;
    hasAccount: string;
    signIn: string;
  };
  recovery: AuthCopy & {
    title: string;
    sub: string;
    cta: string;
    sending: string;
    success: string;
    remember: string;
    signIn: string;
  };
};

const cs: Dictionary = {
  login: {
    title: "Přihlášení e-mailem",
    sub: "Přihlaste se do svého Sklyvo workspace a sledujte, jak přibývají noví klienti.",
    email: "E-mail",
    password: "Heslo",
    showPassword: "Zobrazit heslo",
    hidePassword: "Skrýt heslo",
    forgot: "Zapomenuté heslo?",
    cta: "Pokračovat",
    or: "Nebo se přihlaste přes",
    noAccount: "Nemáte účet?",
    signUp: "Založit účet",
    globeTitle: "Klienti bez hranic",
    globeBody:
      "Jakýkoli obor, jakákoli země. Sklyvo najde vaše klienty a udělá první krok.",
  },
  register: {
    title: "Založení účtu",
    sub: "Vytvořte Sklyvo workspace a začněte budovat pipeline nových klientů.",
    name: "Jméno",
    email: "E-mail",
    password: "Heslo",
    showPassword: "Zobrazit heslo",
    hidePassword: "Skrýt heslo",
    cta: "Založit účet",
    or: "Nebo pokračujte přes",
    hasAccount: "Už máte účet?",
    signIn: "Přihlásit se",
    globeTitle: "Klienti bez hranic",
    globeBody:
      "Jakýkoli obor, jakákoli země. Sklyvo najde vaše klienty a udělá první krok.",
  },
  recovery: {
    title: "Zapomenuté heslo",
    sub: "Zadejte e-mail svého účtu a pošleme vám odkaz pro nastavení nového hesla.",
    email: "E-mail",
    password: "Heslo",
    showPassword: "Zobrazit heslo",
    hidePassword: "Skrýt heslo",
    cta: "Odeslat odkaz",
    sending: "Odesílám…",
    success:
      "Odkaz pro obnovu hesla byl odeslán. Zkontrolujte schránku i spam.",
    or: "Nebo",
    remember: "Vzpomněli jste si?",
    signIn: "Přihlásit se",
    globeTitle: "Klienti bez hranic",
    globeBody:
      "Jakýkoli obor, jakákoli země. Sklyvo najde vaše klienty a udělá první krok.",
  },
};

const en: Dictionary = {
  login: {
    title: "Sign in with email",
    sub: "Sign in to your Sklyvo workspace and watch new clients land in your pipeline.",
    email: "Email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    forgot: "Forgot password?",
    cta: "Get Started",
    or: "Or sign in with",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    globeTitle: "Prospecting without borders",
    globeBody:
      "Any industry, any country. Sklyvo finds your clients and makes the first move.",
  },
  register: {
    title: "Create your account",
    sub: "Set up your Sklyvo workspace and start building a pipeline of new clients.",
    name: "Name",
    email: "Email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    cta: "Create account",
    or: "Or continue with",
    hasAccount: "Already have an account?",
    signIn: "Sign in",
    globeTitle: "Prospecting without borders",
    globeBody:
      "Any industry, any country. Sklyvo finds your clients and makes the first move.",
  },
  recovery: {
    title: "Forgot password",
    sub: "Enter your account email and we’ll send a link to set a new password.",
    email: "Email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    cta: "Send reset link",
    sending: "Sending…",
    success: "Password reset link sent. Check your inbox and spam folder.",
    or: "Or",
    remember: "Remembered it?",
    signIn: "Sign in",
    globeTitle: "Prospecting without borders",
    globeBody:
      "Any industry, any country. Sklyvo finds your clients and makes the first move.",
  },
};

const de: Dictionary = {
  login: {
    title: "Mit E-Mail anmelden",
    sub: "Melden Sie sich in Ihrem Sklyvo-Workspace an und sehen Sie, wie neue Kunden eintreffen.",
    email: "E-Mail",
    password: "Passwort",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    forgot: "Passwort vergessen?",
    cta: "Weiter",
    or: "Oder anmelden mit",
    noAccount: "Noch kein Konto?",
    signUp: "Konto erstellen",
    globeTitle: "Kunden ohne Grenzen",
    globeBody:
      "Jede Branche, jedes Land. Sklyvo findet Ihre Kunden und macht den ersten Schritt.",
  },
  register: {
    title: "Konto erstellen",
    sub: "Richten Sie Ihren Sklyvo-Workspace ein und bauen Sie eine Pipeline neuer Kunden auf.",
    name: "Name",
    email: "E-Mail",
    password: "Passwort",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    cta: "Konto erstellen",
    or: "Oder weiter mit",
    hasAccount: "Bereits ein Konto?",
    signIn: "Anmelden",
    globeTitle: "Kunden ohne Grenzen",
    globeBody:
      "Jede Branche, jedes Land. Sklyvo findet Ihre Kunden und macht den ersten Schritt.",
  },
  recovery: {
    title: "Passwort vergessen",
    sub: "Geben Sie Ihre Konto-E-Mail ein und wir senden Ihnen einen Link zum Festlegen eines neuen Passworts.",
    email: "E-Mail",
    password: "Passwort",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    cta: "Link senden",
    sending: "Wird gesendet…",
    success:
      "Link zum Zurücksetzen wurde gesendet. Prüfen Sie Posteingang und Spam.",
    or: "Oder",
    remember: "Wieder eingefallen?",
    signIn: "Anmelden",
    globeTitle: "Kunden ohne Grenzen",
    globeBody:
      "Jede Branche, jedes Land. Sklyvo findet Ihre Kunden und macht den ersten Schritt.",
  },
};

const es: Dictionary = {
  login: {
    title: "Iniciar sesión con email",
    sub: "Entra a tu workspace de Sklyvo y mira cómo llegan nuevos clientes.",
    email: "Email",
    password: "Contraseña",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    forgot: "¿Olvidaste la contraseña?",
    cta: "Continuar",
    or: "O inicia sesión con",
    noAccount: "¿No tienes cuenta?",
    signUp: "Crear cuenta",
    globeTitle: "Clientes sin fronteras",
    globeBody:
      "Cualquier sector, cualquier país. Sklyvo encuentra tus clientes y da el primer paso.",
  },
  register: {
    title: "Crear cuenta",
    sub: "Configura tu workspace de Sklyvo y empieza a construir un pipeline de nuevos clientes.",
    name: "Nombre",
    email: "Email",
    password: "Contraseña",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    cta: "Crear cuenta",
    or: "O continúa con",
    hasAccount: "¿Ya tienes cuenta?",
    signIn: "Iniciar sesión",
    globeTitle: "Clientes sin fronteras",
    globeBody:
      "Cualquier sector, cualquier país. Sklyvo encuentra tus clientes y da el primer paso.",
  },
  recovery: {
    title: "Contraseña olvidada",
    sub: "Introduce el email de tu cuenta y te enviaremos un enlace para establecer una nueva contraseña.",
    email: "Email",
    password: "Contraseña",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    cta: "Enviar enlace",
    sending: "Enviando…",
    success:
      "Enlace de restablecimiento enviado. Revisa tu bandeja de entrada y spam.",
    or: "O",
    remember: "¿Ya la recordaste?",
    signIn: "Iniciar sesión",
    globeTitle: "Clientes sin fronteras",
    globeBody:
      "Cualquier sector, cualquier país. Sklyvo encuentra tus clientes y da el primer paso.",
  },
};

export const dictionaries: Record<Language, Dictionary> = { cs, en, de, es };

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}
