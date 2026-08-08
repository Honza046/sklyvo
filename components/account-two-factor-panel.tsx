"use client";

import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  beginPasskeyRegistration,
  beginTotpSetup,
  confirmTotpSetup,
  deletePasskey,
  disableTotp,
  finishPasskeyRegistration,
  getTwoFactorStatus,
} from "@/app/actions/two-factor";

type PasskeyRow = {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export function AccountTwoFactorPanel() {
  const [loading, setLoading] = useState(true);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);

  const [totpSetup, setTotpSetup] = useState<{
    qrDataUrl: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);

  const [disablePassword, setDisablePassword] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    const status = await getTwoFactorStatus();
    if ("error" in status) {
      toast.error(status.error);
      return;
    }
    setTotpEnabled(status.totpEnabled);
    setPasskeys(status.passkeys);
  }

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleBeginTotp() {
    setTotpBusy(true);
    try {
      const result = await beginTotpSetup();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setTotpSetup({ qrDataUrl: result.qrDataUrl, secret: result.secret });
      setTotpCode("");
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleConfirmTotp() {
    setTotpBusy(true);
    try {
      const result = await confirmTotpSetup(totpCode);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Authenticator je zapnutý.");
      setTotpSetup(null);
      setTotpCode("");
      await refresh();
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleDisableTotp() {
    if (!disablePassword.trim()) {
      toast.error("Zadejte heslo pro vypnutí.");
      return;
    }
    setTotpBusy(true);
    try {
      const result = await disableTotp({ password: disablePassword });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Authenticator je vypnutý.");
      setDisablePassword("");
      await refresh();
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleAddPasskey() {
    setPasskeyBusy(true);
    try {
      const begin = await beginPasskeyRegistration();
      if ("error" in begin) {
        toast.error(begin.error);
        return;
      }
      const attestation = await startRegistration({ optionsJSON: begin.options });
      const finish = await finishPasskeyRegistration({
        response: attestation,
        name: "Passkey",
      });
      if ("error" in finish) {
        toast.error(finish.error);
        return;
      }
      toast.success("Passkey byl přidán.");
      await refresh();
    } catch (err) {
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Přidání passkey bylo zrušeno."
          : "Nepodařilo se přidat passkey.";
      toast.error(message);
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function handleDeletePasskey(id: string) {
    if (!deletePassword.trim()) {
      toast.error("Zadejte heslo pro odebrání passkey.");
      return;
    }
    setDeletingId(id);
    try {
      const result = await deletePasskey({ id, password: deletePassword });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Passkey byl odebrán.");
      setDeletePassword("");
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Načítám dvoufázové ověření…
      </div>
    );
  }

  return (
    <div className="space-y-6 border-t border-border/50 pt-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[color:var(--sk-brand)]" />
          <h3 className="text-sm font-bold">Dvoufázové ověření</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Po hesle vyžaduj i kód z authenticatoru nebo passkey (Face ID / Touch ID / Windows Hello).
        </p>
      </div>

      {/* TOTP */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-[color-mix(in_oklab,var(--sk-brand)_14%,transparent)] p-2 text-[color:var(--sk-brand)]">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Authenticator app</p>
            <p className="text-xs text-muted-foreground">
              Google Authenticator, 1Password, Authy…
              {totpEnabled ? " — zapnuto" : " — vypnuto"}
            </p>
          </div>
        </div>

        {!totpEnabled && !totpSetup ? (
          <Button
            type="button"
            variant="outline"
            className="sk-press-btn rounded-xl"
            disabled={totpBusy}
            onClick={() => void handleBeginTotp()}
          >
            {totpBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Zapnout authenticator
          </Button>
        ) : null}

        {totpSetup ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Naskenujte QR kód v aplikaci, nebo zadejte tajný klíč ručně.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={totpSetup.qrDataUrl}
              alt="QR kód pro authenticator"
              className="h-[220px] w-[220px] rounded-xl border border-border/60 bg-white p-2"
            />
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              {totpSetup.secret}
            </p>
            <div className="max-w-xs space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ověřovací kód
              </Label>
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="h-11 rounded-xl"
                disabled={totpBusy}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl"
                disabled={totpBusy || totpCode.trim().length < 6}
                onClick={() => void handleConfirmTotp()}
              >
                {totpBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Potvrdit a zapnout
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                disabled={totpBusy}
                onClick={() => {
                  setTotpSetup(null);
                  setTotpCode("");
                }}
              >
                Zrušit
              </Button>
            </div>
          </div>
        ) : null}

        {totpEnabled ? (
          <div className="max-w-sm space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Heslo pro vypnutí
            </Label>
            <Input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="Vaše heslo"
              disabled={totpBusy}
            />
            <Button
              type="button"
              variant="outline"
              className="sk-press-btn rounded-xl"
              disabled={totpBusy}
              onClick={() => void handleDisableTotp()}
            >
              Vypnout authenticator
            </Button>
          </div>
        ) : null}
      </div>

      {/* Passkeys */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-[color-mix(in_oklab,var(--sk-brand)_14%,transparent)] p-2 text-[color:var(--sk-brand)]">
            <Fingerprint className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Passkey</p>
            <p className="text-xs text-muted-foreground">
              Face ID, Touch ID, Windows Hello nebo bezpečnostní klíč
            </p>
          </div>
        </div>

        {passkeys.length > 0 ? (
          <ul className="space-y-2">
            {passkeys.map((pk) => (
              <li
                key={pk.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{pk.name || "Passkey"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Přidáno {new Date(pk.createdAt).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                  disabled={deletingId === pk.id}
                  onClick={() => void handleDeletePasskey(pk.id)}
                  aria-label="Odebrat passkey"
                >
                  {deletingId === pk.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Zatím žádný passkey.</p>
        )}

        {passkeys.length > 0 ? (
          <div className="max-w-sm space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Heslo pro odebrání passkey
            </Label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="Vaše heslo"
            />
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="sk-press-btn rounded-xl"
          disabled={passkeyBusy}
          onClick={() => void handleAddPasskey()}
        >
          {passkeyBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Přidat passkey
        </Button>
      </div>
    </div>
  );
}
