import { useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Check, ChevronDown, Cloud, CloudOff, LoaderCircle, LogOut, Save, UserRound } from "lucide-react";
import Title from "../components/Title";
import { useAuth } from "../lib/auth-context";
import { api, accountError } from "../lib/api";
import type { Account } from "../lib/api";
import { flushUserState, getSyncStatus, subscribeSync } from "../lib/user-state";
import { useI18n } from "../lib/i18n";

export default function ProfilePage({ onBack }: { onBack: () => void }) {
  const { user, updateUser, logout } = useAuth();
  const { t, language } = useI18n();
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus, () => "saved" as const);
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function run(action: string, work: () => Promise<void>) {
    setBusy(action); setError(""); setMessage("");
    try { await work(); } catch (cause) { setError(accountError(cause, language)); }
    finally { setBusy(""); }
  }
  function saveProfile(event: FormEvent) {
    event.preventDefault();
    void run("profile", async () => {
      const result = await api<{ user: Account }>("/profile", { method: "PATCH", body: { username, displayName } });
      updateUser(result.user);
      setUsername(result.user.username); setDisplayName(result.user.displayName);
      setMessage(t("Profil diperbarui."));
    });
  }
  function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) { setError(t("Konfirmasi password tidak cocok.")); return; }
    void run("password", async () => {
      await api("/profile/password", { method: "POST", body: { currentPassword, newPassword } });
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      setMessage(t("Password diperbarui. Sesi lain sudah dikeluarkan."));
    });
  }
  return (
    <div className="page profile-page">
      <header className="settings-page-header"><button className="icon-button back-icon" onClick={onBack} aria-label={t("Kembali")}><ArrowLeft size={20} /></button><Title as="h1">{t("Profil")}</Title></header>
      <button className={`text-button profile-sync-status is-${sync}`} onClick={() => void run("sync", flushUserState)} disabled={!!busy || sync !== "offline"}>
        {sync === "saving" ? <LoaderCircle size={16} className="spin" /> : sync === "offline" ? <CloudOff size={16} /> : <Cloud size={16} />}
        {t(sync === "saving" ? "Menyimpan perubahan…" : sync === "offline" ? "Belum tersinkron. Coba lagi." : "Semua perubahan tersimpan di akun Anda.")}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="profile-success" role="status"><Check size={15} />{message}</p>}
      <form className="account-form profile-section" onSubmit={saveProfile}>
        <Title as="h2"><UserRound size={17} /> {t("Detail Profil")}</Title>
        <div className="profile-name-fields">
          <div className="profile-field">
            <label htmlFor="profile-username">{t("Username")}</label>
            <div className="profile-username-input">
              <span aria-hidden="true">@</span>
              <input id="profile-username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" value={username} onChange={event => setUsername(event.target.value)} />
            </div>
          </div>
          <div className="profile-field">
            <label htmlFor="profile-display-name">{t("Nama Tampilan")}</label>
            <input id="profile-display-name" autoComplete="nickname" maxLength={60} value={displayName} onChange={event => setDisplayName(event.target.value)} />
          </div>
        </div>
        <button className="button primary" disabled={!!busy}><Save size={15} />{t("Simpan Profil")}</button>
      </form>
      <details className="profile-section profile-password">
        <summary><Title>{t("Ubah Password")}</Title><ChevronDown size={17} /></summary>
        <form className="account-form" onSubmit={changePassword}>
        <input className="sr-only" autoComplete="username" value={user.username} readOnly tabIndex={-1} aria-label={t("Username")} />
        <label htmlFor="profile-current-password">{t("Password Saat Ini")}</label><input id="profile-current-password" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        <label htmlFor="profile-new-password">{t("Password Baru")}</label><input id="profile-new-password" type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        <label htmlFor="profile-confirm-password">{t("Konfirmasi Password")}</label><input id="profile-confirm-password" type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
        <button className="button secondary" disabled={!!busy}>{t("Ubah Password")}</button>
        </form>
      </details>
      <button className="button secondary profile-logout" disabled={!!busy} onClick={() => void run("logout", logout)}><LogOut size={15} />{t("Keluar dari akun")}</button>
    </div>
  );
}
