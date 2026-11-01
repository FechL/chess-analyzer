import { historyOf, parseGame, readStorage, writeStorage } from "./chess";
import type { GameData, ReviewMove } from "./chess";
import { retainReview } from "./review";

export type GameAccuracy = { white?: string; black?: string };
export type GameAccuracyIndex = Record<string, GameAccuracy>;
const STORAGE_KEY = "kuda-game-accuracies";

// Metadata, clocks, and board orientation can change when reimporting a game.
export function gameAccuracyKey(game: GameData) {
  return JSON.stringify([game.startFen, game.moves]);
}

export function completedGameAccuracy(
  game: GameData,
  reviews: ReviewMove[],
): GameAccuracy | undefined {
  if (!game.moves.length) return undefined;
  const matching = [
    ...new Map(
      retainReview(reviews, historyOf(game)).map((item) => [item.ply, item]),
    ).values(),
  ];
  if (matching.length !== game.moves.length) return undefined;
  const average = (color: "w" | "b") => {
    const items = matching.filter((item) => item.color === color);
    return items.length
      ? (
          items.reduce((sum, item) => sum + item.accuracy, 0) / items.length
        ).toFixed(1)
      : undefined;
  };
  return { white: average("w"), black: average("b") };
}

export function readGameAccuracies(): GameAccuracyIndex {
  const index = readStorage<GameAccuracyIndex>(STORAGE_KEY, {});
  // Include the last review from versions before per-game accuracy was stored.
  const last = readStorage<{ pgn: string; items: ReviewMove[] } | undefined>(
    "kuda-last-review",
    undefined,
  );
  if (last?.pgn) {
    try {
      const game = parseGame(last.pgn);
      const key = gameAccuracyKey(game);
      const accuracy = completedGameAccuracy(game, last.items);
      if (accuracy && !index[key]) index[key] = accuracy;
    } catch {
      // A stale or invalid cached review must not prevent Home from loading.
    }
  }
  return index;
}

export function saveGameAccuracy(game: GameData, reviews: ReviewMove[]) {
  const accuracy = completedGameAccuracy(game, reviews);
  if (!accuracy) return;
  const index = readGameAccuracies();
  const key = gameAccuracyKey(game);
  delete index[key];
  index[key] = accuracy;
  writeStorage(
    STORAGE_KEY,
    Object.fromEntries(Object.entries(index).slice(-500)),
  );
}
