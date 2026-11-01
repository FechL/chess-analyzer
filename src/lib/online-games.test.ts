import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyGame } from "./chess";
import { gameForUsername, verifiedPlayerUsername } from "./online-games";

describe("saved-player verification", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(["chesscom", "lichess"] as const)(
    "checks the %s profile before accepting a player",
    async (source) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ username: "Alice" })));
      vi.stubGlobal("fetch", fetchMock);
      expect(
        await verifiedPlayerUsername(
          source,
          " alice ",
          new AbortController().signal,
        ),
      ).toBe("Alice");
      expect(fetchMock.mock.calls[0][0]).toBe(
        source === "chesscom"
          ? "https://api.chess.com/pub/player/alice"
          : "https://lichess.org/api/user/alice",
      );
    },
  );
  it("rejects a nonexistent account instead of saving it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    await expect(
      verifiedPlayerUsername(
        "lichess",
        "unknown",
        new AbortController().signal,
      ),
    ).rejects.toThrow("tidak ditemukan");
  });
  it("rejects a malformed successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(
      verifiedPlayerUsername(
        "chesscom",
        "unknown",
        new AbortController().signal,
      ),
    ).rejects.toThrow("profil");
  });
});

describe("searched player's board perspective", () => {
  const game = { ...emptyGame(), white: "Alice", black: "Bob" };

  it("opens from Black's side for the searched Black player", () => {
    expect(gameForUsername(game, " bOB ").perspective).toBe("b");
    expect(game).not.toHaveProperty("perspective");
  });

  it("opens from White's side for the searched White player", () => {
    expect(
      gameForUsername({ ...game, perspective: "b" }, "ALICE").perspective,
    ).toBe("w");
  });

  it("defaults to White for an absent or unmatched username", () => {
    expect(gameForUsername(game, "").perspective).toBe("w");
    expect(gameForUsername(game, "Other").perspective).toBe("w");
  });
});
