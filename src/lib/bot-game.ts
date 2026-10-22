import { Chess } from "chess.js";
import type { Color, PieceSymbol, Square } from "chess.js";
import type { Premove } from "./premove";

export const BOT_LEVELS = [
  {
    name: "Nara",
    title: "Teman belajar",
    elo: 600,
    skill: 0,
    ms: 120,
    mistakeRate: 0.85,
    description:
      "≈600 Elo · Masih melewatkan ancaman dan sering memberi peluang taktis.",
  },
  {
    name: "Raka",
    title: "Pemain santai",
    elo: 1000,
    skill: 3,
    ms: 220,
    mistakeRate: 0.4,
    description:
      "≈1000 Elo · Mengenali tangkapan sederhana, tetapi belum konsisten menjaga buah.",
  },
  {
    name: "Aruna",
    title: "Pemain klub",
    elo: 1400,
    skill: 8,
    ms: 450,
    mistakeRate: 0.12,
    description:
      "≈1400 Elo · Mengembangkan buah dan menemukan kombinasi pendek dengan lebih konsisten.",
  },
  {
    name: "Atlas",
    title: "Tantangan penuh",
    elo: 2000,
    skill: 18,
    ms: 1000,
    mistakeRate: 0,
    description:
      "≈2000 Elo · Pencarian lebih kuat dengan kesalahan yang lebih jarang.",
  },
] as const;
export type TimeControl = { seconds: number; increment: number };
export const TIME_PRESETS = {
  Bullet: [
    { seconds: 60, increment: 0 },
    { seconds: 60, increment: 1 },
    { seconds: 120, increment: 1 },
  ],
  Blitz: [
    { seconds: 180, increment: 0 },
    { seconds: 180, increment: 2 },
    { seconds: 300, increment: 0 },
    { seconds: 300, increment: 3 },
  ],
  Rapid: [
    { seconds: 600, increment: 0 },
    { seconds: 600, increment: 5 },
    { seconds: 900, increment: 10 },
    { seconds: 1800, increment: 0 },
  ],
};
export const timeControlLabel = (control: TimeControl) =>
  control.increment
    ? `${control.seconds / 60}+${control.increment}`
    : `${control.seconds / 60}m`;
export type BotOptions = {
  engine: "lite" | "full";
  engineDepth: number;
  analysisMs: number;
  multiPV: number;
  liveEngine: boolean;
  showArrows: boolean;
  showCategories: boolean;
  showEvalBar: boolean;
  showThreats: boolean;
};
export const DEFAULT_BOT_OPTIONS: BotOptions = {
  engine: "lite",
  engineDepth: 0,
  analysisMs: 800,
  multiPV: 3,
  liveEngine: false,
  showArrows: false,
  showCategories: false,
  showEvalBar: true,
  showThreats: false,
};
export const BOT_MODES = [
  {
    id: "none",
    label: "Tanpa bantuan",
    description: "Tanpa petunjuk, undo, atau bantuan engine.",
  },
  {
    id: "assisted",
    label: "Bantuan",
    description: "Gunakan petunjuk dan undo, tanpa bantuan engine.",
  },
  {
    id: "full",
    label: "Bantuan penuh",
    description: "Petunjuk, undo, serta seluruh opsi dan variasi engine.",
  },
] as const;
export type BotMode = (typeof BOT_MODES)[number]["id"];
export function botPermissions(mode: BotMode) {
  return {
    hint: mode !== "none",
    undo: mode !== "none",
    engine: mode === "full",
  };
}
export type BotSession = {
  mode: BotMode;
  pgn: string;
  level: number;
  side: Color | "random";
  human: Color;
  control: TimeControl;
  clocks: Record<Color, number>;
  started: boolean;
  paused: boolean;
  flipped: boolean;
  outcome: "" | "resigned" | "timeout-w" | "timeout-b";
  viewPly: number | null;
  premoves: Premove[];
};
export function newBotSession(): BotSession {
  return {
    mode: "assisted",
    pgn: new Chess().pgn(),
    level: 0,
    side: "w",
    human: "w",
    control: { seconds: 300, increment: 0 },
    clocks: { w: 300, b: 300 },
    started: false,
    paused: false,
    flipped: false,
    outcome: "",
    viewPly: null,
    premoves: [],
  };
}
export function restoreBotSession(value: unknown): BotSession {
  const fallback = newBotSession();
  try {
    const saved = value as BotSession;
    const chess = new Chess();
    chess.loadPgn(saved.pgn);
    if (
      !Number.isInteger(saved.level) ||
      saved.level < 0 ||
      saved.level >= BOT_LEVELS.length ||
      !["w", "b", "random"].includes(saved.side) ||
      !["w", "b"].includes(saved.human) ||
      !Number.isFinite(saved.control.seconds) ||
      saved.control.seconds < 15 ||
      saved.control.seconds > 10800 ||
      !Number.isFinite(saved.control.increment) ||
      saved.control.increment < 0 ||
      saved.control.increment > 60 ||
      !Number.isFinite(saved.clocks.w) ||
      !Number.isFinite(saved.clocks.b) ||
      saved.clocks.w < 0 ||
      saved.clocks.b < 0
    )
      return fallback;
    return {
      ...fallback,
      ...saved,
      mode: BOT_MODES.some((mode) => mode.id === saved.mode)
        ? saved.mode
        : fallback.mode,
      paused: !!saved.started,
      viewPly:
        saved.viewPly === null
          ? null
          : Math.max(
              0,
              Math.min(chess.history().length, Number(saved.viewPly) || 0),
            ),
      premoves: Array.isArray(saved.premoves)
        ? saved.premoves
            .slice(0, 5)
            .filter(
              (move) =>
                /^[a-h][1-8]$/.test(move.from) &&
                /^[a-h][1-8]$/.test(move.to) &&
                "pnbrqk".includes(move.piece),
            )
        : [],
    };
  } catch {
    return fallback;
  }
}
const VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};
export function chooseBotMove(
  chess: Chess,
  best: string,
  level: number,
  random = Math.random,
): string {
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return "";
  if (
    random() >= BOT_LEVELS[level].mistakeRate &&
    legal.some((move) => move.from + move.to + (move.promotion || "") === best)
  )
    return best;
  // Beginner levels use noisy one-ply choices rather than Stockfish's strongest move.
  const candidates = legal.map((move) => {
    const next = new Chess(chess.fen());
    next.move(move);
    const exposed = next.isAttacked(move.to, next.turn())
      ? VALUE[move.piece]
      : 0;
    const capture = move.captured ? VALUE[move.captured] : 0;
    const center = ["d4", "e4", "d5", "e5", "f3", "c3", "f6", "c6"].includes(
      move.to,
    )
      ? 0.7
      : 0;
    return {
      move,
      weight: Math.max(0.08, 1 + capture * 0.5 - exposed * 0.12 + center),
    };
  });
  let pick = random() * candidates.reduce((sum, item) => sum + item.weight, 0);
  for (const item of candidates) {
    pick -= item.weight;
    if (pick <= 0)
      return item.move.from + item.move.to + (item.move.promotion || "");
  }
  const last = legal.at(-1)!;
  return last.from + last.to + (last.promotion || "");
}
export function capturedBy(chess: Chess, color: Color): PieceSymbol[] {
  return chess
    .history({ verbose: true })
    .filter((move) => move.color === color && move.captured)
    .map((move) => move.captured!)
    .sort((a, b) => VALUE[b] - VALUE[a]);
}
export function threatenedSquares(chess: Chess, human: Color) {
  const enemy = human === "w" ? "b" : "w";
  return Array.from(
    { length: 64 },
    (_, index) =>
      (String.fromCharCode(97 + (index % 8)) +
        (8 - Math.floor(index / 8))) as Square,
  ).filter((square) => chess.isAttacked(square, enemy));
}
