import { Chess, DEFAULT_POSITION } from "chess.js";
import type { Move } from "chess.js";
import { clockSeconds, formatPgnTime } from "./move-time";

export type GameVariation = {
  id: string;
  moves: string[];
  forkPly: number;
  parentId?: string;
};
export type GameData = {
  startFen: string;
  moves: string[];
  white: string;
  black: string;
  event: string;
  result: string;
  source?: string;
  whiteElo?: string;
  blackElo?: string;
  moveTimes?: string[];
  moveDurations?: (number | undefined)[];
  timeControl?: string;
  variations?: GameVariation[];
};
export type EngineLine = {
  depth: number;
  cp: number;
  mate?: number;
  pv: string[];
  multipv: number;
};
export type Evaluation = {
  fen: string;
  lines: EngineLine[];
  bestmove: string;
  depth: number;
  cp: number;
  mate?: number;
};
export type Annotation =
  | "book"
  | "brilliant"
  | "best"
  | "excellent"
  | "good"
  | "miss"
  | "inaccuracy"
  | "mistake"
  | "blunder";
export type ReviewMove = {
  ply: number;
  san: string;
  color: "w" | "b";
  loss: number;
  accuracy: number;
  annotation: Annotation;
  bestSan: string;
  before: Evaluation;
  after: Evaluation;
};
export const LABELS: Record<
  Annotation,
  { label: string; symbol: string; color: string }
> = {
  book: { label: "Book Move", symbol: "▤", color: "#a57b48" },
  brilliant: { label: "Brilian", symbol: "!!", color: "#2ca6b0" },
  best: { label: "Terbaik", symbol: "★", color: "#478a68" },
  excellent: { label: "Sangat baik", symbol: "✦", color: "#73a289" },
  good: { label: "Baik", symbol: "✓", color: "#8d9a83" },
  miss: { label: "Peluang terlewat", symbol: "⊘", color: "#d28b55" },
  inaccuracy: { label: "Kurang tepat", symbol: "?!", color: "#c39b48" },
  mistake: { label: "Kesalahan", symbol: "?", color: "#df8b4e" },
  blunder: { label: "Blunder", symbol: "??", color: "#cc6464" },
};
export const SAMPLE_PGN = `[Event "Opera Game · Paris, 1858"]
[White "Paul Morphy"]
[Black "Duke & Count"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

export function parseGame(input: string): GameData {
  const text = input.trim();
  const chess = new Chess();
  if (!text) throw new Error("Masukkan PGN atau FEN terlebih dahulu.");
  if (text.split(/\s+/)[0]?.split("/").length === 8 && !text.startsWith("[")) {
    chess.load(text);
    return {
      startFen: chess.fen(),
      moves: [],
      white: "Putih",
      black: "Hitam",
      event: "Posisi kustom",
      result: "*",
      source: "FEN",
    };
  }
  chess.loadPgn(text);
  const headers = chess.getHeaders();
  const history = chess.history({ verbose: true });
  const comments = new Map(
    chess.getComments().map((item) => [item.fen, item.comment]),
  );
  const clocks = history.map(
    (move) => comments.get(move.after)?.match(/\[%clk\s+([^\]]+)\]/)?.[1] || "",
  );
  const durations = history.map((move) => {
    const value = comments.get(move.after)?.match(/\[%emt\s+([^\]]+)\]/)?.[1];
    if (!value) return undefined;
    const seconds = clockSeconds(value);
    return seconds !== undefined && seconds >= 0 ? seconds : undefined;
  });
  return {
    startFen: history[0]?.before ?? chess.fen(),
    moves: history.map((m) => m.san),
    white: headers.White || "Putih",
    black: headers.Black || "Hitam",
    event: headers.Event || "Permainan impor",
    result: headers.Result || "*",
    source: "PGN",
    whiteElo: headers.WhiteElo,
    blackElo: headers.BlackElo,
    moveTimes: clocks.some(Boolean) ? clocks : undefined,
    moveDurations: durations.some((time) => time !== undefined)
      ? durations
      : undefined,
    timeControl: headers.TimeControl,
  };
}
export function emptyGame(): GameData {
  return {
    startFen: DEFAULT_POSITION,
    moves: [],
    white: "Putih",
    black: "Hitam",
    event: "Analisis bebas",
    result: "*",
    source: "Bebas",
  };
}
export function positionAt(game: GameData, ply: number): Chess {
  const c = new Chess(game.startFen);
  for (const move of game.moves.slice(0, ply)) c.move(move);
  return c;
}
export function historyOf(game: GameData): Move[] {
  return positionAt(game, game.moves.length).history({ verbose: true });
}
export function toPgn(game: GameData): string {
  const c = new Chess(game.startFen);
  c.header(
    "Event",
    game.event,
    "White",
    game.white,
    "Black",
    game.black,
    "Result",
    game.result,
    ...(game.whiteElo ? ["WhiteElo", game.whiteElo] : []),
    ...(game.blackElo ? ["BlackElo", game.blackElo] : []),
    ...(game.timeControl ? ["TimeControl", game.timeControl] : []),
  );
  game.moves.forEach((san, index) => {
    c.move(san);
    const tags: string[] = [];
    const clock = game.moveTimes?.[index];
    if (clock) tags.push(`[%clk ${clock}]`);
    const duration = game.moveDurations?.[index];
    if (duration !== undefined && Number.isFinite(duration)) {
      tags.push(`[%emt ${formatPgnTime(duration)}]`);
    }
    if (tags.length) c.setComment(tags.join(" "));
  });
  return c.pgn();
}
export function pvToSan(fen: string, pv: string[], max = 6): string[] {
  const c = new Chess(fen);
  const result: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      const m = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      result.push(m.san);
    } catch {
      break;
    }
  }
  return result;
}
export function parseInfo(
  text: string,
  turn: "w" | "b",
): EngineLine | undefined {
  if (
    !text.startsWith("info depth ") ||
    /\b(upperbound|lowerbound)\b/.test(text)
  )
    return;
  const depth = text.match(/\bdepth (\d+)/);
  const score = text.match(/\bscore (cp|mate) (-?\d+)/);
  const pv = text.match(/\bpv (.+)/);
  if (!depth || !score || !pv) return;
  const sign = turn === "w" ? 1 : -1;
  const raw = Number(score[2]);
  return {
    depth: Number(depth[1]),
    multipv: Number(text.match(/\bmultipv (\d+)/)?.[1] ?? 1),
    cp: score[1] === "mate" ? (raw > 0 ? 10000 : -10000) * sign : raw * sign,
    mate: score[1] === "mate" ? raw * sign : undefined,
    pv: pv[1].trim().split(/\s+/),
  };
}
export function formatEval(cp: number, mate?: number): string {
  return mate !== undefined
    ? `${(mate === 0 ? cp >= 0 : mate >= 0) ? "+" : "−"}M${Math.abs(mate)}`
    : `${cp >= 0 ? "+" : "−"}${(Math.abs(cp) / 100).toFixed(2)}`;
}
export function winPercent(cp: number): number {
  return (
    100 / (1 + Math.exp(-0.00368208 * Math.max(-10000, Math.min(10000, cp))))
  );
}

// Conservative local heuristic: the best move offers a non-pawn piece,
// and the engine continuation accepts it without an immediate material recovery.
function isBrilliantSacrifice(move: Move, after: Evaluation): boolean {
  const sign = move.color === "w" ? 1 : -1;
  if (after.cp * sign < -50 || after.fen !== move.after) return false;
  const pv = after.lines.find((line) => line.multipv === 1)?.pv ?? [];
  if (!pv.length) return false;
  const position = new Chess(move.after);
  const initialMaterial = material(move.before) * sign;
  try {
    for (let i = 0; i < Math.min(pv.length, 4); i++) {
      const uci = pv[i];
      const reply = position.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      if (
        i === 0 &&
        (reply.to !== move.to || !reply.captured || reply.captured === "p")
      )
        return false;
    }
  } catch {
    return false;
  }
  if (pv.length < 4 && !position.isCheckmate()) return false;
  return initialMaterial - material(position.fen()) * sign >= 2;
}

export function annotate(
  before: Evaluation,
  after: Evaluation,
  move: Move,
  ply: number,
): ReviewMove {
  const sign = move.color === "w" ? 1 : -1;
  const loss = Math.max(
    0,
    (winPercent(before.cp) - winPercent(after.cp)) * sign,
  );
  const isBest =
    before.bestmove === move.from + move.to + (move.promotion ?? "");
  const brilliant =
    isBest &&
    loss <= 1 &&
    before.depth >= 12 &&
    after.depth >= 12 &&
    isBrilliantSacrifice(move, after);
  const missedOpportunity =
    !isBest &&
    loss > 3 &&
    before.depth >= 12 &&
    after.depth >= 12 &&
    isMissedOpportunity(before, after, move);
  const annotation: Annotation = brilliant
    ? "brilliant"
    : isBest
      ? "best"
      : missedOpportunity
        ? "miss"
        : loss <= 1
          ? "excellent"
          : loss <= 3
            ? "good"
            : loss <= 8
              ? "inaccuracy"
              : loss <= 16
                ? "mistake"
                : "blunder";
  return {
    ply,
    san: move.san,
    color: move.color,
    loss,
    accuracy: Math.max(
      0,
      Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1668),
    ),
    annotation,
    bestSan: pvToSan(move.before, [before.bestmove])[0] ?? "—",
    before,
    after,
  };
}

function isMissedOpportunity(
  before: Evaluation,
  after: Evaluation,
  move: Move,
): boolean {
  const sign = move.color === "w" ? 1 : -1;
  const initial = before.cp * sign;
  const remaining = after.cp * sign;
  const lostWin = initial >= 200 && remaining < 100;
  const lostEquality = initial >= -50 && initial <= 50 && remaining <= -200;
  if (!lostWin && !lostEquality) return false;
  // Require a concrete forcing opportunity, rather than labeling every drop a miss.
  try {
    const position = new Chess(move.before);
    const best = position.move({
      from: before.bestmove.slice(0, 2),
      to: before.bestmove.slice(2, 4),
      promotion: before.bestmove[4],
    });
    return best.isCapture() || position.isCheck();
  } catch {
    return false;
  }
}

export function material(fen: string) {
  const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let white = 0,
    black = 0;
  new Chess(fen)
    .board()
    .flat()
    .forEach((p) => {
      if (p) {
        if (p.color === "w") white += values[p.type];
        else black += values[p.type];
      }
    });
  return white - black;
}
export function gameStatus(c: Chess): string {
  if (c.isCheckmate())
    return `Skakmat. ${c.turn() === "w" ? "Hitam" : "Putih"} menang!`;
  if (c.isStalemate()) return "Remis karena stalemate.";
  if (c.isThreefoldRepetition()) return "Remis karena pengulangan tiga kali.";
  if (c.isInsufficientMaterial()) return "Remis: material tidak cukup.";
  if (c.isDraw()) return "Permainan berakhir remis.";
  return `${c.turn() === "w" ? "Putih" : "Hitam"} melangkah${c.isCheck() ? " · Skak!" : ""}`;
}
export function downloadFile(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (key === "kuda-lessons")
      window.dispatchEvent(new Event("kuda-progress"));
  } catch {
    /* Private mode or full storage: the current session still works. */
  }
}
