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
  games: OnlineGame[];
  archives: string[];
  archiveIndex: number;
  next?: number;
  initialized: boolean;
  exhausted: boolean;
};

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
  target = 10,
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
    feed.archives = await chessArchives(player.username, signal);
    signal.throwIfAborted();
    feed.initialized = true;
    feed.exhausted = !feed.archives.length;
  }
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
    }
    feed.games = [
      ...new Map(
        [...feed.games, ...games].map((game) => [game.id, game]),
      ).values(),
    ].sort((a, b) => b.date - a.date);
  }
  return feed;
}
