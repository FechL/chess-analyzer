import { afterEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import {
  consumePuzzle,
  ensurePuzzles,
  parseLichessPuzzle,
} from "./lichess-puzzles";
const record = {
  game: { pgn: "e4 e5 Nf3 Nc6" },
  puzzle: {
    id: "abc12",
    initialPly: 3,
    rating: 1450,
    themes: ["opening"],
    solution: ["f1b5", "a7a6"],
  },
};
describe("Lichess puzzle conversion", () => {
  it("starts after the setup move and converts the complete UCI solution to SAN", () => {
    const puzzle = parseLichessPuzzle(record);
    expect(puzzle.solution).toEqual(["Bb5", "a6"]);
    expect(puzzle.url).toBe("https://lichess.org/training/abc12");
    expect(new Chess(puzzle.fen).turn()).toBe("w");
  });
  it("trims game history at initialPly rather than replaying unrelated later moves", () => {
    const puzzle = parseLichessPuzzle({
      ...record,
      puzzle: { ...record.puzzle, initialPly: 1, solution: ["g1f3"] },
    });
    expect(puzzle.solution).toEqual(["Nf3"]);
    expect(new Chess(puzzle.fen).get("g1")?.type).toBe("n");
  });
  it("rejects malformed payloads", () => {
    expect(() => parseLichessPuzzle({})).toThrow("tidak valid");
  });
});

describe("Lichess puzzle queue", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deduplicates refills and never restores a puzzle consumed during a pending request", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const seed = ["one", "two", "three", "four", "five"].map((id) => ({
      ...parseLichessPuzzle(record),
      id,
    }));
    storage.set("kuda-lichess-puzzles-mix-normal", JSON.stringify(seed));
    consumePuzzle("mix", "normal", "one");
    let resolveResponse!: (response: Response) => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const fetchMock = vi.fn(() => {
      markStarted();
      return new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const refill = ensurePuzzles("mix", "normal");
    expect(ensurePuzzles("mix", "normal")).toBe(refill);
    await started;
    consumePuzzle("mix", "normal", "two");
    resolveResponse(new Response(JSON.stringify({ puzzles: [record] })));
    const queue = await refill;
    expect(queue.map((item) => item.id)).toEqual([
      "three",
      "four",
      "five",
      "abc12",
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.get("kuda-lichess-puzzles-mix-normal")!)).toEqual(
      queue,
    );
  });
});
