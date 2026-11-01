import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyGame } from "./chess";
import { chessArchives, chessMonth, lichessGames } from "./online-games";
import type { OnlineGame } from "./online-games";
import { loadPlayerGames, matchesGameDate, savedPlayer } from "./player-games";

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

describe("saved player game feeds", () => {
  beforeEach(() => vi.resetAllMocks());

  it("can fill an initial hundred games across multiple Lichess pages", async () => {
    for (let index = 0; index < 5; index++) {
      vi.mocked(lichessGames).mockResolvedValueOnce({
        games: games(100 - index * 20, 20),
        next: index === 4 ? undefined : 80 - index * 20,
      });
    }
    const feed = await loadPlayerGames(
      savedPlayer("lichess", "alice"),
      new AbortController().signal,
    );
    expect(feed.games).toHaveLength(100);
    expect(lichessGames).toHaveBeenCalledTimes(5);
  });

  it("loads another hundred games and stops cleanly when fewer remain", async () => {
    vi.mocked(lichessGames)
      .mockResolvedValueOnce({ games: games(100, 20), next: 80 })
      .mockResolvedValueOnce({ games: games(80, 20), next: 60 })
      .mockResolvedValueOnce({ games: games(60, 7), next: undefined });
    const previous = {
      games: games(200, 100),
      archives: [],
      archiveIndex: 0,
      initialized: true,
      exhausted: false,
      next: 100,
    };
    const feed = await loadPlayerGames(
      savedPlayer("lichess", "alice"),
      new AbortController().signal,
      previous,
      200,
    );
    expect(feed.games).toHaveLength(147);
    expect(feed.exhausted).toBe(true);
    expect(lichessGames).toHaveBeenCalledTimes(3);
    expect(previous.games).toHaveLength(100);
  });

  it("matches day, month and year independently using the displayed UTC date", () => {
    const timestamp = Date.UTC(2025, 11, 2, 23, 59);
    expect(matchesGameDate(timestamp, { day: 2, month: 12, year: 2025 })).toBe(
      true,
    );
    expect(matchesGameDate(timestamp, { month: 12 })).toBe(true);
    expect(matchesGameDate(timestamp, { day: 3 })).toBe(false);
    expect(matchesGameDate(timestamp, { year: 2024 })).toBe(false);
  });

  it("fetches only matching Chess.com archives and filters days within the month", async () => {
    const december = "https://api.chess.com/pub/player/alice/games/2025/12";
    vi.mocked(chessArchives).mockResolvedValue([
      december,
      "https://api.chess.com/pub/player/alice/games/2025/11",
      "https://api.chess.com/pub/player/alice/games/2024/12",
    ]);
    vi.mocked(chessMonth).mockResolvedValue([
      { ...games(1, 1)[0], date: Date.UTC(2025, 11, 2) },
      { ...games(2, 1)[0], date: Date.UTC(2025, 11, 1) },
    ]);
    const feed = await loadPlayerGames(
      savedPlayer("chesscom", "alice"),
      new AbortController().signal,
      undefined,
      10,
      { year: 2025, month: 12, day: 2 },
    );
    expect(feed.games.map((game) => game.id)).toEqual(["1"]);
    expect(chessMonth).toHaveBeenCalledTimes(1);
    expect(chessMonth).toHaveBeenCalledWith(december, expect.any(AbortSignal));
    expect(feed.exhausted).toBe(true);
  });

  it("seeks directly to the selected Lichess date and stops at its lower boundary", async () => {
    vi.mocked(lichessGames).mockResolvedValue({
      games: [
        { ...games(1, 1)[0], date: Date.UTC(2025, 11, 2, 12) },
        { ...games(2, 1)[0], date: Date.UTC(2025, 11, 1, 12) },
      ],
      next: Date.UTC(2025, 11, 1),
    });
    const signal = new AbortController().signal;
    const feed = await loadPlayerGames(
      savedPlayer("lichess", "alice"),
      signal,
      undefined,
      10,
      { year: 2025, month: 12, day: 2 },
    );
    expect(lichessGames).toHaveBeenCalledWith(
      "alice",
      signal,
      Date.UTC(2025, 11, 3) - 1,
    );
    expect(feed.games.map((game) => game.id)).toEqual(["1"]);
    expect(feed.exhausted).toBe(true);
    expect(lichessGames).toHaveBeenCalledTimes(1);
  });

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
    const first = await loadPlayerGames(player, signal, undefined, 10);
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
    const first = await loadPlayerGames(player, signal, undefined, 10);
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
