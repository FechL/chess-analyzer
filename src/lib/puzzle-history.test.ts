import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION } from "chess.js";
import { appendPuzzleHistory, normalizePuzzleHistory } from "./puzzle-history";
import type { PuzzleHistoryEntry } from "./puzzle-history";

const entry = (id: string): PuzzleHistoryEntry => ({
  id,
  rating: 1200,
  elapsedMs: 12450,
  clean: true,
  outcome: "solved",
  puzzle: {
    id,
    rating: 1200,
    fen: DEFAULT_POSITION,
    solution: ["e4"],
    themes: ["opening"],
    url: `https://lichess.org/training/${id}`,
  },
});

describe("reopenable puzzle history", () => {
  it("retains complete positions, solutions, outcomes and frozen completion times", () => {
    const old = entry("abc12");
    const history = appendPuzzleHistory([old], entry("abc13"));
    const restored = JSON.parse(
      JSON.stringify(history),
    ) as PuzzleHistoryEntry[];
    expect(restored[1]).toMatchObject({ ...old, number: 1 });
    expect(restored[1].puzzle?.solution).toEqual(["e4"]);
    expect(old).not.toHaveProperty("number");
  });
  it("keeps exactly the latest 100 and continues numbering beyond 100", () => {
    let history: PuzzleHistoryEntry[] = [];
    for (let n = 0; n < 102; n++)
      history = appendPuzzleHistory(history, entry(String(n)));
    expect(history).toHaveLength(100);
    expect(history[0]).toMatchObject({ id: "101", number: 102 });
    expect(history.at(-1)).toMatchObject({ id: "2", number: 3 });
    expect(history.every((item) => !!item.puzzle)).toBe(true);
  });
  it("keeps legacy records available for lazy snapshot loading", () => {
    const { puzzle: _, ...legacy } = entry("abc12");
    const history = normalizePuzzleHistory([legacy]);
    expect(history[0]).toEqual({ ...legacy, number: 1 });
  });
});
