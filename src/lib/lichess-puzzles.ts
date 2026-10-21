import { Chess } from "chess.js";
import { readStorage, writeStorage } from "./chess";
export type LichessPuzzle = {
  id: string;
  fen: string;
  solution: string[];
  rating: number;
  themes: string[];
  url: string;
};
export type PuzzleDifficulty =
  "easiest" | "easier" | "normal" | "harder" | "hardest";
export function parseLichessPuzzle(value: unknown): LichessPuzzle {
  const record = value as {
    game: { pgn: string };
    puzzle: {
      id: string;
      rating: number;
      themes: string[];
      initialPly: number;
      solution: string[];
    };
  };
  if (
    !record?.puzzle?.id ||
    !record.game?.pgn ||
    !Array.isArray(record.puzzle.solution)
  )
    throw new Error("Data puzzle Lichess tidak valid.");
  const chess = new Chess();
  chess.loadPgn(record.game.pgn);
  while (chess.history().length > record.puzzle.initialPly + 1) chess.undo();
  const fen = chess.fen();
  const solution = record.puzzle.solution.map(
    (uci) =>
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      }).san,
  );
  return {
    id: record.puzzle.id,
    rating: record.puzzle.rating,
    themes: record.puzzle.themes || [],
    fen,
    solution,
    url: "https://lichess.org/training/" + record.puzzle.id,
  };
}
const storageKey = (theme: string, difficulty: string) =>
  "kuda-lichess-puzzles-" + theme + "-" + difficulty;
const pending = new Map<string, Promise<LichessPuzzle[]>>();
let networkQueue: Promise<unknown> = Promise.resolve();
export function cachedPuzzles(theme: string, difficulty: string) {
  return readStorage<LichessPuzzle[]>(storageKey(theme, difficulty), []);
}
export function consumePuzzle(theme: string, difficulty: string, id: string) {
  const queue = cachedPuzzles(theme, difficulty).filter(
    (item) => item.id !== id,
  );
  writeStorage(storageKey(theme, difficulty), queue);
  const seen = readStorage<string[]>("kuda-puzzle-seen", []);
  writeStorage("kuda-puzzle-seen", [...new Set([...seen, id])].slice(-300));
}
export function ensurePuzzles(
  theme: string,
  difficulty: PuzzleDifficulty,
): Promise<LichessPuzzle[]> {
  const key = storageKey(theme, difficulty);
  if (pending.has(key)) return pending.get(key)!;
  if (cachedPuzzles(theme, difficulty).length >= 5)
    return Promise.resolve(cachedPuzzles(theme, difficulty));
  const request = networkQueue
    .catch(() => {})
    .then(async () => {
      const existing = cachedPuzzles(theme, difficulty);
      if (existing.length >= 5) return existing;
      const response = await fetch(
        "https://lichess.org/api/puzzle/batch/" +
          encodeURIComponent(theme) +
          "?nb=" +
          (5 - existing.length) +
          "&difficulty=" +
          difficulty,
        {
          signal: AbortSignal.timeout(25000),
          credentials: "omit",
          headers: { Accept: "application/json" },
        },
      );
      if (response.status === 429)
        throw new Error(
          "Batas permintaan Lichess tercapai. Tunggu satu menit sebelum mencoba lagi.",
        );
      if (!response.ok)
        throw new Error("Puzzle Lichess belum dapat diambil. Coba lagi nanti.");
      const body = (await response.json()) as { puzzles: unknown[] };
      if (!Array.isArray(body.puzzles))
        throw new Error("Data puzzle Lichess tidak valid.");
      const seen = new Set(readStorage<string[]>("kuda-puzzle-seen", []));
      const combined = cachedPuzzles(theme, difficulty).filter(
        (item) => !seen.has(item.id),
      );
      for (const item of body.puzzles) {
        const puzzle = parseLichessPuzzle(item);
        if (
          !seen.has(puzzle.id) &&
          !combined.some((old) => old.id === puzzle.id)
        )
          combined.push(puzzle);
      }
      writeStorage(key, combined.slice(0, 5));
      return combined.slice(0, 5);
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  networkQueue = request;
  return request;
}
