export type Account = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
};
export class ApiError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
let expectedUser: string | undefined;
export function setApiUser(id?: string) { expectedUser = id; }
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Kuda-Request": "1",
        ...(expectedUser ? { "X-Kuda-User": expectedUser } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch { throw new ApiError("NETWORK_ERROR", 0); }
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(value?.error || "SERVER_ERROR", response.status);
  if (!value) throw new ApiError("SERVER_ERROR", response.status);
  return value as T;
}

export function accountError(error: unknown, language: "id" | "en") {
  const code = error instanceof ApiError ? error.code : "SERVER_ERROR";
  const messages: Record<string, [string, string]> = {
    USERNAME_INVALID: ["Username harus 3–24 karakter: huruf, angka, atau garis bawah.", "Use 3–24 letters, numbers, or underscores for your username."],
    USERNAME_TAKEN: ["Username tersebut sudah digunakan.", "That username is already taken."],
    PASSWORD_INVALID: ["Password minimal 6 karakter dan maksimal 128 karakter.", "Use a password between 6 and 128 characters."],
    CREDENTIALS_INVALID: ["Password salah. Periksa username dan password Anda.", "Incorrect password. Check your username and password."],
    CURRENT_PASSWORD_INVALID: ["Password saat ini salah.", "Your current password is incorrect."],
    PROFILE_INVALID: ["Nama tampilan maksimal 60 karakter dan bio maksimal 500 karakter.", "Use up to 60 characters for your display name and 500 for your bio."],
    TRY_LATER: ["Terlalu banyak percobaan. Silakan coba lagi nanti.", "Too many attempts. Please try again later."],
    AUTH_REQUIRED: ["Sesi berakhir. Silakan masuk kembali.", "Your session expired. Please sign in again."],
    ACCOUNT_CHANGED: ["Akun berubah di tab lain. Muat ulang halaman ini.", "Your account changed in another tab. Reload this page."],
    NETWORK_ERROR: ["Tidak dapat terhubung ke server. Pastikan npm run dev berjalan.", "Cannot connect to the server. Make sure npm run dev is running."],
    SERVER_ERROR: ["Server belum siap. Silakan coba lagi.", "The server is not ready. Please try again."],
  };
  return (messages[code] || messages.SERVER_ERROR)[language === "en" ? 1 : 0];
}
