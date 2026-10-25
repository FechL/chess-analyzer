import { Chess } from "chess.js";
import type { Move } from "chess.js";
import type { Opening } from "../data/content";
import data from "../data/opening-lines.json";

export type OpeningLine = {
  id: string;
  eco: string;
  name: string;
  moves: string[];
  aliases?: string[];
  intro?: boolean;
  source?: {
    bookPly: number;
    curated?: boolean;
    training?: boolean;
    seedLineId?: string;
    references?: string[];
    continuation?: {
      engine: string;
      depth: number;
      nodes: number;
      plies?: number;
      multiPv?: number;
    };
  };
  quality?: {
    checkedMoves: number;
    maxLossCp: number;
    minScoreCp: number;
  };
};
export type OpeningMode = "learn" | "practice" | "review";
export type LineProgress = {
  learned: boolean;
  attempts: number;
  cleanStreak: number;
  mistakes: number;
  dueAt: number;
  lastAt: number;
  intervalDays: number;
  completed?: Partial<
    Record<"learn" | "practice", { mistakes: number; hints: number }>
  >;
};
export type OpeningProgress = Record<string, LineProgress>;
const courses: Record<string, OpeningLine[]> = data;
const DAY = 86_400_000;
const INTERVALS = [1, 3, 7, 14, 30];

export function openingLines(opening: Opening): OpeningLine[] {
  // Introductions are included in the audited data, so they obey the same
  // quality checks and always finish after the learner's response.
  return courses[opening.id] || [];
}

export function recordOpeningAttempt(
  previous: LineProgress | undefined,
  mode: OpeningMode,
  mistakes: number,
  hints: number,
  now = Date.now(),
): LineProgress {
  const clean = mode !== "learn" && mistakes === 0 && hints === 0;
  const cleanStreak = clean ? (previous?.cleanStreak || 0) + 1 : 0;
  const intervalDays = clean
    ? INTERVALS[Math.min(cleanStreak - 1, INTERVALS.length - 1)]
    : 0;
  // Reading a familiar line must not erase its existing review schedule.
  const keepSchedule = mode === "learn" && !!previous?.intervalDays;
  const previousPractice = previous?.completed?.practice;
  const practiceAlreadyPerfect =
    previousPractice?.mistakes === 0 && previousPractice.hints === 0;
  return {
    ...previous,
    learned: true,
    attempts: (previous?.attempts || 0) + 1,
    cleanStreak: keepSchedule ? previous.cleanStreak : cleanStreak,
    mistakes: (previous?.mistakes || 0) + mistakes,
    dueAt: keepSchedule ? previous.dueAt : now + intervalDays * DAY,
    lastAt: now,
    intervalDays: keepSchedule ? previous.intervalDays : intervalDays,
    completed:
      mode === "review"
        ? previous?.completed
        : {
            ...previous?.completed,
            [mode]:
              mode === "practice" && practiceAlreadyPerfect
                ? previousPractice
                : { mistakes, hints },
          },
  };
}

export function isOpeningLineUnlocked(
  lines: OpeningLine[],
  progress: OpeningProgress,
  lineId: string,
  mode: OpeningMode,
) {
  const index = lines.findIndex((line) => line.id === lineId);
  if (index < 0) return false;
  const previousComplete = lines
    .slice(0, index)
    .every((line) => progress[line.id]?.learned);
  return previousComplete && (mode === "learn" || !!progress[lineId]?.learned);
}

export function dueOpeningLines(
  lines: OpeningLine[],
  progress: OpeningProgress,
  now = Date.now(),
) {
  return lines.filter(
    (line) =>
      isOpeningLineUnlocked(lines, progress, line.id, "review") &&
      progress[line.id].dueAt <= now,
  );
}

export function nextOpeningLine(
  lines: OpeningLine[],
  progress: OpeningProgress,
  mode: OpeningMode,
  currentId?: string,
  now = Date.now(),
): OpeningLine | undefined {
  let candidates =
    mode === "review"
      ? dueOpeningLines(lines, progress, now)
      : mode === "learn"
        ? lines.filter(
            (line) =>
              isOpeningLineUnlocked(lines, progress, line.id, mode) &&
              !progress[line.id]?.learned,
          )
        : lines.filter((line) =>
            isOpeningLineUnlocked(lines, progress, line.id, mode),
          );
  if (!candidates.length && mode === "learn")
    candidates = lines.filter((line) =>
      isOpeningLineUnlocked(lines, progress, line.id, mode),
    );
  const alternatives = candidates.filter((line) => line.id !== currentId);
  if (alternatives.length) candidates = alternatives;
  if (mode !== "learn")
    candidates = [...candidates].sort(
      (a, b) =>
        (progress[a.id]?.dueAt || 0) - (progress[b.id]?.dueAt || 0) ||
        (progress[b.id]?.mistakes || 0) - (progress[a.id]?.mistakes || 0),
    );
  return candidates[0];
}

export function openingPositions(line: OpeningLine) {
  const chess = new Chess();
  const positions = [chess.fen()];
  const moves = line.moves.map((san) => {
    const move = chess.move(san);
    positions.push(chess.fen());
    return move;
  });
  return { positions, moves };
}

export function openingMoveIdea(move?: Move): string {
  if (!move)
    return "Variasi ini selesai. Ulangi tanpa petunjuk untuk menguji ingatanmu.";
  if (move.isKingsideCastle() || move.isQueensideCastle())
    return "Amankan raja dan hubungkan benteng. Perhatikan jalur yang terbuka setelah rokade.";
  if (move.san.includes("+"))
    return "Langkah ini memberi skak. Perhatikan bagaimana respons raja memengaruhi posisi berikutnya.";
  if (move.captured)
    return "Setelah pertukaran ini, periksa kembali struktur pion dan buah yang menguasai pusat.";
  if (move.piece === "n")
    return "Aktifkan kuda sambil mengamati petak pusat dan ancaman bercabang pada langkah berikutnya.";
  if (move.piece === "b")
    return "Tempatkan gajah pada diagonal aktif. Perhatikan pion dan petak yang menjadi sasarannya.";
  if (move.piece === "q")
    return "Menteri menambah tekanan. Pastikan ia tidak menjadi sasaran serangan yang memberi tempo kepada lawan.";
  if (move.piece === "r")
    return "Aktifkan benteng pada lajur yang berguna dan cari hubungan dengan buah lain.";
  if (move.piece === "k")
    return "Periksa keselamatan raja dan petak yang dikontrol lawan sebelum melanjutkan rencana.";
  if (["d", "e"].includes(move.to[0]))
    return "Dorongan pion pusat mengubah ruang dan membuka jalur buah. Periksa apakah pusat perlu didukung atau ditukar.";
  return "Langkah pion ini mengontrol petak baru, tetapi juga meninggalkan petak yang tidak bisa dijaganya lagi.";
}
