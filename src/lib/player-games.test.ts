import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyGame } from "./chess";
import { chessArchives, chessMonth, lichessGames } from "./online-games";
import type { OnlineGame } from "./online-games";
import { loadPlayerGames, savedPlayer } from "./player-games";

vi.mock("./online-games", async (original) => ({
  ...(await original<typeof import("./online-games")>()),
  chessArchives: vi.fn(),
  chessMonth: vi.fn(),
  lichessGames: vi.fn(),
}));

const games = (start: number, count: number): OnlineGame[] =>
  Array.from({ length: count }, (_, n) => ({
    id: String(start - n),
    date: start - n,
    speed: "blitz",
    game: emptyGame(),
  }));

describe("saved players and ten-game feeds", () => {
  beforeEach(() => vi.resetAllMocks());

  it("deduplicates usernames case-insensitively within each platform", () => {
    expect(savedPlayer("chesscom", " Alice ").id).toBe(
      savedPlayer("chesscom", "ALICE").id,
    );
    expect(savedPlayer("lichess", "Alice").id).not.toBe(
      savedPlayer("chesscom", "Alice").id,
    );
    expect(() =>
      savedPlayer("lichess", "https://lichess.org/@/Alice"),
    ).toThrow();
  });

  it("fills the first ten across months and retains unshown games for Load More", async () => {
    vi.mocked(chessArchives).mockResolvedValue(["new", "previous", "old"]);
    vi.mocked(chessMonth)
      .mockResolvedValueOnce(games(100, 3))
      .mockResolvedValueOnce(games(97, 12))
      .mockResolvedValueOnce(games(85, 8));
    const player = savedPlayer("chesscom", "Alice");
    const signal = new AbortController().signal;
    const first = await loadPlayerGames(player, signal);
    expect(first.games).toHaveLength(15);
    expect(first.games.slice(0, 10).map((game) => game.id)).toEqual(
      games(100, 10).map((game) => game.id),
    );
    expect(first.archiveIndex).toBe(2);
    const more = await loadPlayerGames(player, signal, first, 20);
    expect(more.games.slice(0, 20).map((game) => game.id)).toEqual(
      games(100, 20).map((game) => game.id),
    );
    expect(more.exhausted).toBe(true);
    expect(first.games).toHaveLength(15);
    expect(first.archiveIndex).toBe(2);
    expect(chessArchives).toHaveBeenCalledTimes(1);
  });

  it("uses buffered Lichess games before requesting the next cursor and deduplicates overlap", async () => {
    vi.mocked(lichessGames)
      .mockResolvedValueOnce({ games: games(100, 20), next: 80 })
      .mockResolvedValueOnce({ games: games(81, 15), next: undefined });
    const player = savedPlayer("lichess", "Alice");
    const signal = new AbortController().signal;
    const first = await loadPlayerGames(player, signal);
    const second = await loadPlayerGames(player, signal, first, 20);
    expect(lichessGames).toHaveBeenCalledTimes(1);
    const third = await loadPlayerGames(player, signal, second, 30);
    expect(lichessGames).toHaveBeenLastCalledWith("Alice", signal, 80);
    expect(new Set(third.games.map((game) => game.id)).size).toBe(
      third.games.length,
    );
    expect(third.games).toHaveLength(34);
  });

  it("reloads from the latest archives and handles a player with no games", async () => {
    vi.mocked(chessArchives).mockResolvedValue([]);
    const result = await loadPlayerGames(
      savedPlayer("chesscom", "Alice"),
      new AbortController().signal,
    );
    expect(result.games).toEqual([]);
    expect(result.exhausted).toBe(true);
    expect(chessMonth).not.toHaveBeenCalled();
  });

  it("stops an aborted request before fetching any more months", async () => {
    const controller = new AbortController();
    vi.mocked(chessArchives).mockImplementation(async () => {
      controller.abort();
      return ["new"];
    });
    await expect(
      loadPlayerGames(savedPlayer("chesscom", "Alice"), controller.signal),
    ).rejects.toThrow();
    expect(chessMonth).not.toHaveBeenCalled();
  });
});
