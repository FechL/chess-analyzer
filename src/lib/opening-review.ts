import type { OpeningLine, OpeningProgress } from "./opening-training";

export type ReviewOptions = { lives: boolean; timer: boolean };

export function reviewCandidates(
  lines: OpeningLine[],
  progress: OpeningProgress,
): OpeningLine[] {
  return lines.filter((line) => {
    const state = progress[line.id];
    const practice = state?.completed?.practice;
    return (
      !!state?.learned &&
      !!practice &&
      practice.mistakes === 0 &&
      practice.hints === 0
    );
  });
}

export function shuffleReviewLines(lines: OpeningLine[]): string[] {
  const ids = lines.map((line) => line.id);
  for (let index = ids.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
  }
  return ids;
}

export function reviewModeKey(options: ReviewOptions): string {
  return `${Number(options.lives)}-${Number(options.timer)}`;
}

export function reviewInitialTimeMs(lines: OpeningLine[]): number {
  return lines.reduce((total, line) => total + line.moves.length * 1000, 0);
}

export function reviewTimeBonusMs(line: OpeningLine): number {
  return line.moves.length * 500;
}
