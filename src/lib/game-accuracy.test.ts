import { afterEach, describe, expect, it, vi } from "vitest";
import { annotate, historyOf, parseGame, toPgn } from "./chess";
import type { Evaluation } from "./chess";
import {
  completedGameAccuracy,
  gameAccuracyKey,
  readGameAccuracies,
  saveGameAccuracy,
} from "./game-accuracy";

const game = parseGame("1. e4 e5 2. Nf3 Nc6 *");
const evaluation = (fen: string): Evaluation => ({
  fen,
  cp: 0,
  depth: 12,
  bestmove: "",
  lines: [],
});
const reviews = historyOf(game).map((move, index) => ({
  ...annotate(evaluation(move.before), evaluation(move.after), move, index + 1),
  accuracy: [90, 80, 100, 95][index],
}));

describe("saved game accuracy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("averages each player's mainline moves using the analysis score format", () => {
    expect(completedGameAccuracy(game, reviews)).toEqual({
      white: "95.0",
      black: "87.5",
    });
    expect(completedGameAccuracy(game, [...reviews, reviews[0]])).toEqual({
      white: "95.0",
      black: "87.5",
    });
  });

  it("does not show a full-game accuracy for incomplete or mismatched reviews", () => {
    expect(completedGameAccuracy(game, reviews.slice(1))).toBeUndefined();
    expect(
      completedGameAccuracy(parseGame("1. e4 c5 2. Nf3 Nc6 *"), reviews),
    ).toBeUndefined();
  });

  it("matches reimported games despite different metadata and orientation", () => {
    expect(
      gameAccuracyKey({
        ...game,
        perspective: "b",
        source: "Chess.com",
        whiteElo: "1500",
      }),
    ).toBe(gameAccuracyKey(game));
    expect(gameAccuracyKey({ ...game, moves: ["d4", "d5"] })).not.toBe(
      gameAccuracyKey(game),
    );
  });

  it("keeps previous games' scores after another game is reviewed and reloads them", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    saveGameAccuracy(game, reviews);
    const shorter = { ...game, moves: game.moves.slice(0, 2) };
    saveGameAccuracy(shorter, reviews.slice(0, 2));
    expect(readGameAccuracies()[gameAccuracyKey(game)]).toEqual({
      white: "95.0",
      black: "87.5",
    });
    expect(readGameAccuracies()[gameAccuracyKey(shorter)]).toEqual({
      white: "90.0",
      black: "80.0",
    });
  });

  it("also reads a complete review saved before this feature was added", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === "kuda-last-review"
          ? JSON.stringify({ pgn: toPgn(game), items: reviews })
          : null,
    });
    expect(readGameAccuracies()[gameAccuracyKey(game)]).toEqual({
      white: "95.0",
      black: "87.5",
    });
  });
});
