import { api, ApiError, setApiUser } from "./api";

export type StoredValues = Record<string, string>;
type ChangeSet = Record<string, string | null>;
export type SyncStatus = "saved" | "saving" | "offline";
const ownerKey = "kuda-auth-user";
const legacyKey = "kuda-legacy-backup-v1";
const importedKey = "kuda-legacy-imported-v1";
const internal = /^kuda-(auth-|sync-|legacy-)/;
export const isUserStateKey = (key: string) => key.startsWith("kuda-") && !internal.test(key);
let userId: string | undefined;
let values: StoredValues = {};
let pending: ChangeSet = {};
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | undefined;
let status: SyncStatus = "saved";
const listeners = new Set<() => void>();
const safeGet = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSet = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Database-backed memory still works when browser storage is full. */ } };
const safeRemove = (key: string) => { try { localStorage.removeItem(key); } catch { /* Optional cache. */ } };
const outboxKey = (id: string) => `kuda-sync-outbox:${id}`;
function notify(next: SyncStatus) { status = next; for (const listener of listeners) listener(); }
export const subscribeSync = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getSyncStatus = () => status;
function cacheKeys() {
  try { return Object.keys(localStorage).filter(isUserStateKey); } catch { return []; }
}
export function legacyState(): StoredValues | null {
  if (safeGet(importedKey)) return null;
  const previous = safeGet(legacyKey);
  if (previous) { try { return JSON.parse(previous); } catch { return null; } }
  if (safeGet(ownerKey) || safeGet("kuda-auth-has-account")) return null;
  const snapshot: StoredValues = {};
  for (const key of cacheKeys()) {
    const value = safeGet(key);
    if (value !== null) snapshot[key] = value;
  }
  if (!Object.keys(snapshot).length) return null;
  safeSet(legacyKey, JSON.stringify(snapshot));
  return snapshot;
}
export function readUserStorageValue(key: string) {
  if (userId && isUserStateKey(key)) return values[key] ?? null;
  return safeGet(key);
}
function persistOutbox() { if (userId) safeSet(outboxKey(userId), JSON.stringify(pending)); }
function schedule(delay = 700) {
  clearTimeout(timer);
  timer = setTimeout(() => { void flushUserState().catch(() => {}); }, delay);
}
export function persistUserStorageValue(key: string, value: string) {
  if (userId && safeGet(ownerKey) !== userId) return;
  safeSet(key, value);
  if (!userId || !isUserStateKey(key)) return;
  values[key] = value;
  pending[key] = value;
  persistOutbox();
  notify("saving");
  schedule();
}
export async function flushUserState(): Promise<void> {
  clearTimeout(timer);
  if (inFlight) { await inFlight; if (Object.keys(pending).length) return flushUserState(); return; }
  if (!userId || !Object.keys(pending).length) return;
  const id = userId;
  const batch = { ...pending };
  inFlight = (async () => {
    try {
      if (safeGet(ownerKey) !== id) throw new ApiError("ACCOUNT_CHANGED", 409);
      notify("saving");
      await api("/state", { method: "PATCH", body: { userId: id, changes: batch } });
      if (userId !== id) return;
      for (const [key, value] of Object.entries(batch)) if (pending[key] === value) delete pending[key];
      persistOutbox();
      notify(Object.keys(pending).length ? "saving" : "saved");
      if (Object.keys(pending).length) schedule();
    } catch (error) {
      if (userId === id) {
        notify("offline");
        if (error instanceof ApiError && [401, 409].includes(error.status)) window.dispatchEvent(new Event("kuda-auth-expired"));
        else schedule(5000);
      }
      throw error;
    }
  })();
  try { await inFlight; } finally { inFlight = undefined; }
}
export async function hydrateUserState(id: string, importLegacy = false) {
  stopUserState();
  setApiUser(id);
  if (importLegacy) {
    const legacy = legacyState();
    if (legacy) {
      await api("/state/import", { method: "POST", body: { userId: id, changes: legacy } });
      safeSet(importedKey, "true");
    }
  }
  const snapshot = await api<{ userId: string; values: StoredValues }>("/state");
  if (snapshot.userId !== id) throw new ApiError("ACCOUNT_CHANGED", 409);
  let queued: ChangeSet = {};
  try {
    const parsed = JSON.parse(safeGet(outboxKey(id)) || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      queued = Object.fromEntries(Object.entries(parsed).filter(([key, value]) => isUserStateKey(key) && (typeof value === "string" || value === null))) as ChangeSet;
  } catch { /* Empty outbox. */ }
  values = { ...snapshot.values };
  for (const [key, value] of Object.entries(queued)) {
    if (!isUserStateKey(key)) continue;
    if (value === null) delete values[key]; else values[key] = value;
  }
  for (const key of cacheKeys()) safeRemove(key);
  for (const [key, value] of Object.entries(values)) safeSet(key, value);
  safeSet(ownerKey, id);
  safeSet("kuda-auth-has-account", "true");
  userId = id;
  pending = queued;
  notify(Object.keys(pending).length ? "saving" : "saved");
  if (Object.keys(pending).length) schedule();
}
export function stopUserState(clearCache = false) {
  clearTimeout(timer);
  persistOutbox();
  userId = undefined;
  values = {};
  pending = {};
  setApiUser(undefined);
  if (clearCache) {
    for (const key of cacheKeys()) safeRemove(key);
    safeRemove(ownerKey);
  }
}
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("online", () => { if (userId) schedule(0); });
  window.addEventListener("pagehide", () => {
    if (!userId || !Object.keys(pending).length) return;
    persistOutbox();
    // Retain the outbox until a normal request acknowledges it after reload.
    void fetch("/api/state", { method: "PATCH", credentials: "same-origin", keepalive: true,
      headers: { "Content-Type": "application/json", "X-Kuda-Request": "1", "X-Kuda-User": userId },
      body: JSON.stringify({ userId, changes: pending }),
    }).catch(() => {});
  });
}
