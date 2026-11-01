import type { LichessPuzzle } from "./lichess-puzzles";

export type PuzzleHistoryEntry = {
  id: string;
  number?: number;
  clean?: boolean;
  rating: number;
  elapsedMs: number;
  outcome: "solved" | "skipped";
  puzzle?: LichessPuzzle;
};

export function normalizePuzzleHistory(entries: PuzzleHistoryEntry[]) {
  return entries
    .map((entry, index) => ({
      ...entry,
      number: entry.number ?? entries.length - index,
    }))
    .slice(0, 100);
}

export function appendPuzzleHistory(
  history: PuzzleHistoryEntry[],
  entry: PuzzleHistoryEntry,
) {
  const normalized = normalizePuzzleHistory(history);
  return [
    { ...entry, number: (normalized[0]?.number ?? 0) + 1 },
    ...normalized,
  ].slice(0, 100);
}
