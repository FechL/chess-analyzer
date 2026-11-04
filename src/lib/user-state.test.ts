import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function storageWith(initial: Record<string, string>) {
  const value = Object.assign(Object.create({
    getItem(this: Record<string, string>, key: string) { return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null; },
    setItem(this: Record<string, string>, key: string, item: string) { this[key] = item; },
    removeItem(this: Record<string, string>, key: string) { delete this[key]; },
  }), initial);
  return value as Storage;
}

describe("database-backed browser state", () => {
  let state: typeof import("./user-state");
  let remote: Record<string, Record<string, string>>;
  let offline: boolean;
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    remote = { alice: { "kuda-library": '["Alice game"]' }, bob: { "kuda-library": '["Bob game"]' } };
    offline = false;
    vi.stubGlobal("localStorage", storageWith({}));
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("fetch", vi.fn(async (path: string, options: RequestInit = {}) => {
      const id = (options.headers as Record<string, string>)["X-Kuda-User"];
      if (path === "/api/state" && !options.body) return Response.json({ userId: id, values: { ...remote[id] } });
      if (offline) throw new Error("offline");
      const body = JSON.parse(String(options.body));
      if (path === "/api/state/import") {
        for (const [key, value] of Object.entries(body.changes)) remote[id][key] ??= value as string;
      } else Object.assign(remote[id], body.changes);
      return Response.json({ ok: true, imported: true });
    }));
    state = await import("./user-state");
  });
  afterEach(() => {
    state.stopUserState();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("loads and saves account state without leaking one account's data to another", async () => {
    await state.hydrateUserState("alice");
    expect(state.readUserStorageValue("kuda-library")).toBe('["Alice game"]');
    state.persistUserStorageValue("kuda-notes", '{"position":"Alice notes"}');
    await state.flushUserState();
    expect(remote.alice["kuda-notes"]).toContain("Alice notes");
    await state.hydrateUserState("bob");
    expect(state.readUserStorageValue("kuda-library")).toBe('["Bob game"]');
    expect(state.readUserStorageValue("kuda-notes")).toBeNull();
    expect(localStorage.getItem("kuda-notes")).toBeNull();
  });

  it("keeps pending writes through offline reloads and retries them", async () => {
    await state.hydrateUserState("alice");
    offline = true;
    state.persistUserStorageValue("kuda-library", '["Not yet synced"]');
    await expect(state.flushUserState()).rejects.toThrow();
    expect(state.getSyncStatus()).toBe("offline");
    await state.hydrateUserState("alice");
    expect(state.readUserStorageValue("kuda-library")).toBe('["Not yet synced"]');
    offline = false;
    await state.flushUserState();
    expect(remote.alice["kuda-library"]).toBe('["Not yet synced"]');
    expect(state.getSyncStatus()).toBe("saved");
  });

  it("imports an unowned browser backup once without changing raw sound preferences", async () => {
    localStorage.setItem("kuda-notes", '{"legacy":"note"}');
    localStorage.setItem("kuda-board-sound", "off");
    expect(state.legacyState()?.["kuda-board-sound"]).toBe("off");
    await state.hydrateUserState("alice", true);
    expect(remote.alice["kuda-notes"]).toBe('{"legacy":"note"}');
    expect(state.readUserStorageValue("kuda-board-sound")).toBe("off");
    expect(state.legacyState()).toBeNull();
    expect(localStorage.getItem("kuda-legacy-backup-v1")).toBeTruthy();
  });

  it("does not write through a stale account after another tab switches accounts", async () => {
    await state.hydrateUserState("alice");
    localStorage.setItem("kuda-auth-user", "bob");
    state.persistUserStorageValue("kuda-notes", '"stale"');
    expect(localStorage.getItem("kuda-notes")).toBeNull();
    expect(state.readUserStorageValue("kuda-notes")).toBeNull();
  });
});
