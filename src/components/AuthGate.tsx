import { useEffect, useLayoutEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { api, accountError } from "../lib/api";
import type { Account } from "../lib/api";
import { AuthContext } from "../lib/auth-context";
import { flushUserState, hydrateUserState, legacyState, readUserStorageValue, stopUserState } from "../lib/user-state";
import { setLanguage, useI18n } from "../lib/i18n";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { t, language } = useI18n();
  const [user, setUser] = useState<Account | null>(null);
  const [phase, setPhase] = useState<"loading" | "anonymous" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [legacy] = useState(() => legacyState());

  useLayoutEffect(() => {
    if (phase === "ready") return;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      const mode = systemTheme.matches ? "dark" : "light";
      document.documentElement.dataset.colorMode = mode;
      document.documentElement.classList.toggle("dark", mode === "dark");
      document.documentElement.style.colorScheme = mode;
    };
    applySystemTheme();
    systemTheme.addEventListener("change", applySystemTheme);
    return () => systemTheme.removeEventListener("change", applySystemTheme);
  }, [phase]);

  async function prepare(account: Account, importLocal = false) {
    await hydrateUserState(account.id, importLocal);
    let preference: { language?: "id" | "en" } = {};
    try { preference = JSON.parse(readUserStorageValue("kuda-settings") || "{}"); } catch { /* Defaults. */ }
    setLanguage(preference.language || "en");
    let target = "analysis";
    try {
      target = JSON.parse(readUserStorageValue("kuda-route") || "null") ||
        (JSON.parse(readUserStorageValue("kuda-analysis-open") || "false") ? "analysis/game" : "analysis");
    } catch { /* Start at Analysis. */ }
    if (typeof target !== "string" || !/^[a-z0-9/_-]+$/i.test(target)) target = "analysis";
    history.replaceState(history.state, "", `#${target}`);
    setUser(account);
    setPhase("ready");
  }
  useEffect(() => {
    let active = true;
    setPhase("loading");
    void api<{ user: Account | null }>("/auth/me").then(async result => {
      if (!active) return;
      if (!result.user) { setPhase("anonymous"); return; }
      await prepare(result.user);
    }).catch(cause => {
      if (active) { setError(accountError(cause, language)); setPhase("error"); }
    });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    const expired = () => {
      stopUserState();
      setUser(null);
      setPhase("anonymous");
    };
    const changed = (event: StorageEvent) => {
      if (event.key === "kuda-auth-user" && event.newValue !== user?.id) {
        expired();
        if (event.newValue) setAttempt(value => value + 1);
      }
    };
    window.addEventListener("kuda-auth-expired", expired);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener("kuda-auth-expired", expired);
      window.removeEventListener("storage", changed);
    };
  }, [user?.id]);

  if (phase === "loading") return (
    <div className="auth-screen"><p className="auth-loading-text" role="status">{t("Memuat akun…")}</p></div>
  );
  if (phase === "error") return (
    <div className="auth-screen">
      <div className="auth-card auth-status" role="status">
        <p>{error}</p><button className="button primary" onClick={() => setAttempt(value => value + 1)}>{t("Coba lagi")}</button>
      </div>
    </div>
  );
  if (phase === "anonymous" || !user) return <AccountForm hasLegacy={!!legacy && !!legacyState()} onAuthenticate={prepare} />;
  return (
    <AuthContext.Provider value={{ user, updateUser: setUser, logout: async () => {
      await flushUserState();
      await api("/auth/logout", { method: "POST", body: {} });
      stopUserState(true);
      setUser(null);
      setPhase("anonymous");
      history.replaceState(history.state, "", "#analysis");
    } }}>
      <div key={user.id} className="authenticated-app">{children}</div>
    </AuthContext.Provider>
  );
}

function AccountForm({ hasLegacy, onAuthenticate }: {
  hasLegacy: boolean;
  onAuthenticate: (user: Account, importLocal: boolean) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [importLocal, setImportLocal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (registering && password !== confirmation) { setError(t("Konfirmasi password tidak cocok.")); return; }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: Account }>(`/auth/${registering ? "register" : "login"}`, { method: "POST", body: { username, password } });
      await onAuthenticate(result.user, registering && hasLegacy && importLocal);
    } catch (cause) { setError(accountError(cause, language)); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth-screen">
      <main className="auth-card">
        <div className="auth-brand"><span className="brand-icon"><img src="/pieces/wN.svg" alt="" /></span><div><strong>kuda</strong><small>CHESS STUDIO</small></div></div>
        <h1>{t(registering ? "Buat Akun" : "Masuk")}</h1>
        <p className="auth-intro">{t("Simpan permainan, preferensi, dan progres Anda dalam satu akun.")}</p>
        <form onSubmit={submit} className="account-form">
          <label htmlFor="auth-username">{t("Username")}</label>
          <input id="auth-username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" value={username} disabled={busy} onChange={event => setUsername(event.target.value)} />
          {registering && <small>{t("3–24 karakter: huruf, angka, atau garis bawah. Username tidak membedakan huruf besar dan kecil.")}</small>}
          <label htmlFor="auth-password">{t("Password")}</label>
          <div className="password-input">
            <input id="auth-password" type={visible ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? 6 : undefined} maxLength={128} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />
            <button type="button" className="icon-button" aria-label={t(visible ? "Sembunyikan password" : "Tampilkan password")} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          {registering && <><label htmlFor="auth-confirm">{t("Konfirmasi Password")}</label><input id="auth-confirm" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={6} maxLength={128} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></>}
          {registering && hasLegacy && <label className="import-local-setting"><input type="checkbox" checked={importLocal} onChange={event => setImportLocal(event.target.checked)} />{t("Pindahkan data yang sudah tersimpan di browser ini ke akun baru.")}</label>}
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <LogIn size={16} />}{t(registering ? "Buat Akun" : "Masuk")}</button>
        </form>
        <button className="text-button auth-switch" disabled={busy} onClick={() => { setRegistering(value => !value); setError(""); setPassword(""); setConfirmation(""); }}>{t(registering ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar")}</button>
        <div className="auth-language"><button className="text-button" onClick={() => setLanguage("en")}>English</button><span>·</span><button className="text-button" onClick={() => setLanguage("id")}>Indonesia</button></div>
      </main>
    </div>
  );
}
