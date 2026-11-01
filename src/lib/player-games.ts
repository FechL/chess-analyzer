import {
  chessArchives,
  chessMonth,
  lichessGames,
  normalizeUsername,
} from "./online-games";
import type { OnlineGame } from "./online-games";

export type SavedPlayer = {
  id: string;
  source: "chesscom" | "lichess";
  username: string;
};
export type PlayerGameFeed = {
  visibleLimit?: number;
  games: OnlineGame[];
  archives: string[];
  archiveIndex: number;
  next?: number;
  initialized: boolean;
  exhausted: boolean;
};
export type GameDateFilter = { day?: number; month?: number; year?: number };

export function matchesGameDate(timestamp: number, filter: GameDateFilter) {
  const date = new Date(timestamp);
  return (
    (!filter.day || date.getUTCDate() === filter.day) &&
    (!filter.month || date.getUTCMonth() + 1 === filter.month) &&
    (!filter.year || date.getUTCFullYear() === filter.year)
  );
}

function dateBounds(filter: GameDateFilter) {
  if (!filter.year) return;
  const month = filter.month ? filter.month - 1 : 0;
  const day = filter.month && filter.day ? filter.day : 1;
  const start = Date.UTC(filter.year, month, day);
  const end = filter.month
    ? filter.day
      ? Date.UTC(filter.year, month, day + 1)
      : Date.UTC(filter.year, month + 1, 1)
    : Date.UTC(filter.year + 1, 0, 1);
  return { start, end };
}

export function savedPlayer(
  source: SavedPlayer["source"],
  input: string,
): SavedPlayer {
  const username = normalizeUsername(input);
  return { id: `${source}:${username.toLowerCase()}`, source, username };
}

/** Keep the unshown games and source cursor so ten-game pages never skip a month. */
export async function loadPlayerGames(
  player: SavedPlayer,
  signal: AbortSignal,
  previous?: PlayerGameFeed,
  target = 100,
  filter: GameDateFilter = {},
): Promise<PlayerGameFeed> {
  const feed: PlayerGameFeed = previous
    ? {
        ...previous,
        games: [...previous.games],
        archives: [...previous.archives],
      }
    : {
        games: [],
        archives: [],
        archiveIndex: 0,
        initialized: false,
        exhausted: false,
      };
  if (player.source === "chesscom" && !feed.initialized) {
    feed.archives = (await chessArchives(player.username, signal)).filter(
      (url) => {
        const [year, month] = url.split("/").slice(-2).map(Number);
        return (
          (!filter.year || year === filter.year) &&
          (!filter.month || month === filter.month)
        );
      },
    );
    signal.throwIfAborted();
    feed.initialized = true;
    feed.exhausted = !feed.archives.length;
  }
  const bounds = dateBounds(filter);
  if (player.source === "lichess" && !feed.initialized && bounds)
    feed.next = bounds.end - 1;
  while (feed.games.length < target && !feed.exhausted) {
    signal.throwIfAborted();
    let games: OnlineGame[];
    if (player.source === "chesscom") {
      games = await chessMonth(feed.archives[feed.archiveIndex], signal);
      signal.throwIfAborted();
      feed.archiveIndex++;
      feed.exhausted = feed.archiveIndex >= feed.archives.length;
    } else {
      const page = await lichessGames(player.username, signal, feed.next);
      signal.throwIfAborted();
      games = page.games;
      feed.initialized = true;
      feed.exhausted = page.next === undefined || page.next === feed.next;
      feed.next = page.next;
      if (bounds && page.next !== undefined && page.next < bounds.start)
        feed.exhausted = true;
    }
    feed.games = [
      ...new Map(
        [
          ...feed.games,
          ...games.filter((game) => matchesGameDate(game.date, filter)),
        ].map((game) => [game.id, game]),
      ).values(),
    ].sort((a, b) => b.date - a.date);
  }
  return feed;
}
